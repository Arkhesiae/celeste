/**
 * Tests des règles de repos / de charge utilisées par le calcul de compatibilité (services/substitution/compatibility/categorizeDemand.js).
 *
 * Fonctions pures, sans base de données :  node --test backend/test/
 *
 * Règles (d'après les commentaires du code, appliquées à des vacations « work ») :
 *   R1  repos >= 11 h entre deux vacations                                     (checkMinimumRestTime)
 *   R2  un repos continu >= 35 h dans chaque période de 7 jours glissants       (checkWeeklyRestPeriod)
 *   R3  <= 48 h de travail dans chaque période de 7 jours glissants             (checkWeeklyWorkHours)
 *   R4  <= 5 jours de travail consécutifs                                       (checkConsecutiveWorkDays)
 *   R5  repos >= 12 h après une vacation de contrôle de nuit                    (checkRestAfterNightControl)
 *   R6  <= 2 vacations de nuit consécutives                                     (checkConsecutiveNightControls)
 *   R7  repos >= 48 h après deux vacations de nuit consécutives                 (checkRestAfterTwoNightControls)
 * Toutes sont appliquées par le calcul de compatibilité (legalLimitsFor, categorizeDemand.js).
 *
 * Modèle de temps : une vacation = { date: 'YYYY-MM-DD', startTime: 'HH:mm', endTime: 'HH:mm', endsNextDay }, lue dans
 * le fuseau du centre ; les fonctions `check*` reçoivent le planning converti en Temporal.ZonedDateTime
 * (`withZonedBounds`). Les tests de règles utilisent le fuseau 'UTC' (aucun décalage), la section « Fuseau » Paris.
 *
 * `{ todo: true }` = défaut connu (le test décrit le comportement attendu, il échoue aujourd'hui) : voir
 * docs/quality/blocking-issues.md (#47). Un contrôle de nuit est une vacation qui travaille à un moment quelconque
 * entre 00h00 et 06h00, heure du centre.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  categorize,
  checkMinimumRestTime,
  checkWeeklyRestPeriod,
  checkWeeklyWorkHours,
  checkConsecutiveWorkDays,
  checkRestAfterNightControl,
  checkConsecutiveNightControls,
  checkRestAfterTwoNightControls,
} from '../services/substitution/compatibility/categorizeDemand.js';
import { shiftMapToArray } from '../services/planning/planning.shiftsMap.js';
import { isNightControl } from '../utils/shifts/nightControl.js';
import { withZonedBounds, wallClockIso } from '../utils/shifts/shiftTime.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────
const DAY0 = '2026-03-10'; // un mardi, loin d'un changement d'heure
const addDays = (dateKey, dayCount) => new Date(Date.parse(`${dateKey}T00:00:00Z`) + dayCount * 86400000).toISOString().slice(0, 10);
const day = (dayCount) => addDays(DAY0, dayCount);

/** Une vacation « work » : work('2026-03-10', '07:00', '15:00') ; work(d, '22:00', '06:00', true) pour une nuit */
const work = (date, startTime, endTime, endsNextDay = false) => ({
  shift: { type: 'work', name: `${startTime}-${endTime}`, default: { startTime, endTime, endsNextDay } },
  team: null,
  date,
  startTime,
  endTime,
  endsNextDay,
});

/** Planning trié (shiftMapToArray) puis converti en instants du fuseau (withZonedBounds), prêt pour les règles */
const planningOf = (shifts, timeZone = 'UTC') => withZonedBounds(shiftMapToArray(new Map(shifts.map((shift) => [shift.date, shift]))), timeZone);
const indexAt = (planning, date) => planning.findIndex((shift) => shift.date === date);

/** Résultats des trois premières règles pour une cible située à `date` */
const rules = (shifts, date) => {
  const planning = planningOf(shifts);
  const restAroundTarget = checkMinimumRestTime(planning, indexAt(planning, date));
  return {
    rest11: restAroundTarget.ok,
    restBefore: restAroundTarget.restBefore,
    restAfter: restAroundTarget.restAfter,
    rest35: checkWeeklyRestPeriod(planning, date, true).restOk,
    work48: checkWeeklyWorkHours(planning, date, true).workOk,
  };
};

/** Série de vacations identiques sur des jours consécutifs, à partir du jour firstDayOffset */
const series = (firstDayOffset, count, startTime, endTime, endsNextDay = false) =>
  Array.from({ length: count }, (_, index) => work(day(firstDayOffset + index), startTime, endTime, endsNextDay));

// ─── R1 : 11 h entre deux vacations ──────────────────────────────────────────
test('R1 11h : exactement 11h avant et après est accepté', () => {
  // 07:00-15:00 la veille -> cible 02:00-10:00 (11h de repos avant : 15:00 -> 02:00 le lendemain)
  assert.equal(rules([work(day(0), '07:00', '15:00'), work(day(1), '02:00', '10:00')], day(1)).rest11, true);
  assert.equal(rules([work(day(1), '02:00', '10:00'), work(day(2), '21:00', '23:00')], day(1)).rest11, true);
});

test('R1 11h : 10h59 avant ou après est refusé', () => {
  assert.equal(rules([work(day(0), '07:00', '15:01'), work(day(1), '02:00', '10:00')], day(1)).rest11, false);
  assert.equal(rules([work(day(1), '02:00', '10:00'), work(day(2), '20:59', '23:00')], day(1)).rest11, true);
  assert.equal(rules([work(day(1), '12:00', '22:00'), work(day(2), '08:59', '12:00')], day(1)).rest11, false);
  assert.equal(rules([work(day(1), '12:00', '22:00'), work(day(2), '09:00', '12:00')], day(1)).rest11, true);
});

test('R1 11h : une nuit qui finit le lendemain compte pour le repos avant la vacation suivante', () => {
  const night = work(day(0), '22:00', '06:00', true); // finit le jour 1 à 06:00
  assert.equal(rules([night, work(day(1), '16:59', '20:00')], day(1)).rest11, false); // 10h59
  assert.equal(rules([night, work(day(1), '17:00', '20:00')], day(1)).rest11, true); // 11h
});

test('R1 11h : deux vacations qui se chevauchent sont refusées', () => {
  const night = work(day(0), '22:00', '06:00', true);
  assert.equal(rules([night, work(day(1), '05:00', '13:00')], day(1)).rest11, false);
});

test('R1 11h : sans voisin, ou cible non travaillée, rien à contrôler', () => {
  assert.equal(rules([work(day(0), '07:00', '15:00')], day(0)).rest11, true);
  const restDay = { ...work(day(0), '07:00', '15:00'), shift: { type: 'rest', name: 'R' } };
  assert.deepEqual(checkMinimumRestTime(planningOf([restDay]), 0), { restBefore: 0, restAfter: 0, ok: true });
});

test('R1 11h : le repos avant / après est renvoyé en minutes', () => {
  const result = rules([work(day(0), '07:00', '15:00'), work(day(1), '07:00', '15:00'), work(day(2), '07:00', '15:00')], day(1));
  assert.equal(result.restBefore, 16 * 60);
  assert.equal(result.restAfter, 16 * 60);
});

// ─── R2 : 35 h de repos continu sur 7 jours ──────────────────────────────────
test('R2 35h : le repos est borné par la fenêtre de 7 jours (comportement voulu) : une semaine 5/2 lundi-vendredi est refusée', () => {
  // Le repos du week-end (vendredi 15:00 -> lundi 07:00) fait 64h, mais une fenêtre de 7 jours qui commence le dimanche
  // n'en contient que 31h (avant lundi) + 33h (après vendredi) : aucune n'atteint 35h continues. Voulu : le repos de 35h
  // doit tenir tout entier dans chaque période de 7 jours glissants.
  const week = [];
  for (let dayIndex = 0; dayIndex < 8 * 7; dayIndex++) if (dayIndex % 7 < 5) week.push(work(addDays('2026-03-02', dayIndex), '07:00', '15:00'));
  for (const target of ['2026-03-17', '2026-03-18', '2026-03-19']) {
    assert.equal(rules(week, target).rest35, false, `cible ${target}`);
  }
});

test('R2 35h : 7 jours de travail d\'affilée sont refusés', () => {
  assert.equal(rules(series(-3, 7, '07:00', '15:00'), day(0)).rest35, false);
});

test('R2 35h : 6 jours de travail, la fenêtre de 7 jours garde 1 jour de repos mais seulement 16h entre 2 vacations', () => {
  assert.equal(rules(series(0, 6, '07:00', '15:00'), day(2)).rest35, false);
});

test('R2 35h : exactement 35h est accepté, 34h59 refusé (fenêtre alignée sur le jour de la cible)', () => {
  assert.equal(rules([work(day(0), '06:00', '08:00'), work(day(1), '19:00', '23:00')], day(0)).rest35, true);
  // Une semaine pleine de vacations d'1h espacées de 34h59 : aucune fenêtre n'a 35h continues
  const dense = [];
  let currentMs = Date.parse(`${day(-6)}T00:00:00Z`);
  const cutoffMs = Date.parse(`${day(6)}T23:59:00Z`);
  while (currentMs < cutoffMs) {
    const current = new Date(currentMs);
    const date = current.toISOString().slice(0, 10);
    if (!dense.some((shift) => shift.date === date)) {
      const startTime = current.toISOString().slice(11, 16);
      const endHour = (current.getUTCHours() + 1) % 24;
      dense.push(work(date, startTime, `${String(endHour).padStart(2, '0')}:${startTime.slice(3)}`, current.getUTCHours() + 1 >= 24));
    }
    currentMs += (34 * 60 + 59 + 60) * 60000; // 1h de travail + 34h59 de repos
  }
  const targetDate = dense[Math.floor(dense.length / 2)].date;
  assert.equal(rules(dense, targetDate).rest35, false);
});

test('R2 35h : une nuit qui chevauche le début de fenêtre ne donne pas de repos initial', () => {
  const shifts = [work(day(-7), '22:00', '06:00', true), work(day(-5), '06:00', '14:00'), work(day(-4), '06:00', '14:00'),
    work(day(-3), '06:00', '14:00'), work(day(-2), '06:00', '14:00'), work(day(-1), '06:00', '14:00'), work(day(0), '06:00', '14:00')];
  assert.equal(rules(shifts, day(0)).rest35, false);
});

test('R2 35h : sans aucune autre vacation dans la fenêtre, le repos est acquis', () => {
  assert.equal(checkWeeklyRestPeriod(planningOf([work(day(0), '07:00', '15:00')]), day(0), true).restOk, true);
});

test('R2 35h : fullScan liste toutes les fenêtres en défaut, sinon s\'arrête à la première', () => {
  const planning = planningOf(series(-6, 13, '07:00', '15:00'));
  const full = checkWeeklyRestPeriod(planning, day(0), true);
  const quick = checkWeeklyRestPeriod(planning, day(0), false);
  assert.equal(full.restOk, false);
  assert.ok(full.invalidWindows35.length > 1);
  assert.equal(quick.invalidWindows35.length, 1);
});

// ─── R3 : 48 h de travail sur 7 jours ────────────────────────────────────────
test('R3 48h : 6 x 8h = 48h est accepté, 6 x 8h + 1 min est refusé', () => {
  assert.equal(rules(series(0, 6, '06:00', '14:00'), day(2)).work48, true);
  const over = [...series(0, 5, '06:00', '14:00'), work(day(5), '06:00', '14:01')];
  assert.equal(rules(over, day(2)).work48, false);
});

test('R3 48h : une vacation à cheval sur le bord de fenêtre est comptée au prorata', () => {
  // 5 x 9h = 45h dans la fenêtre + une nuit qui n'a que 2h dans la fenêtre = 47h : accepté
  assert.equal(rules([...series(0, 5, '06:00', '15:00'), work(day(6), '22:00', '06:00', true)], day(0)).work48, true);
  // la même nuit tout entière dans la fenêtre (8h) = 53h : refusé
  assert.equal(rules([...series(0, 5, '06:00', '15:00'), work(day(5), '21:00', '05:00', true)], day(0)).work48, false);
});

test('R3 48h : le glissement couvre les 13 fenêtres qui contiennent la cible (cible -6 .. +6)', () => {
  // 7 x 8h = 56h sur les jours 6..12 : seule la fenêtre [6, 13) les contient tous (les autres en ont au plus 6 = 48h)
  const base = series(6, 7, '06:00', '14:00');
  assert.equal(rules([work(day(0), '06:00', '10:00'), ...base], day(0)).work48, false); // dernière fenêtre = [6, 13)
  assert.equal(rules([work(day(-1), '06:00', '10:00'), ...base], day(-1)).work48, true); // fenêtres [.., 12) : 6 jours max
});

// ─── Modèle aléatoire contre un oracle indépendant ──────────────────────────
const mulberry32 = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
};

/** Oracle minute par minute (fuseau UTC : aucun décalage) : mêmes règles, écrites naïvement */
const oracle = (planning, targetDate) => {
  const minuteOf = (zonedDateTime) => Math.round(zonedDateTime.epochMilliseconds / 60000);
  const targetDayStart = Date.parse(`${targetDate}T00:00:00Z`) / 60000;
  const origin = targetDayStart - 20 * 1440;
  const span = 45 * 1440;
  const busy = new Uint8Array(span);
  for (const shift of planning) {
    for (let minute = Math.max(0, minuteOf(shift.start) - origin); minute < Math.min(span, minuteOf(shift.end) - origin); minute++) busy[minute] = 1;
  }
  const target = planning.find((shift) => shift.date === targetDate);
  let rest11 = true;
  for (const shift of planning) {
    if (shift === target) continue;
    if (minuteOf(shift.end) > minuteOf(target.start) - 660 && minuteOf(shift.start) < minuteOf(target.end) + 660) rest11 = false;
  }
  let rest35 = true;
  let work48 = true;
  for (let windowIndex = 0; windowIndex < 13; windowIndex++) {
    const windowStart = targetDayStart + (windowIndex - 6) * 1440 - origin;
    const windowEnd = windowStart + 7 * 1440;
    let longestRest = 0; let currentRest = 0; let worked = 0;
    for (let minute = windowStart; minute < windowEnd; minute++) {
      if (busy[minute]) { worked++; currentRest = 0; } else { currentRest++; if (currentRest > longestRest) longestRest = currentRest; }
    }
    if (longestRest < 35 * 60) rest35 = false;
    if (worked > 48 * 60) work48 = false;
  }
  return { rest11, rest35, work48 };
};

test('Aléatoire : R1, R2 et R3 concordent avec un oracle minute par minute (3000 plannings)', () => {
  const random = mulberry32(20261111);
  let failures = 0;
  let overlappingPlannings = 0;
  const failureDetails = [];
  const hhmm = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  for (let attempt = 0; attempt < 3000; attempt++) {
    const density = 0.25 + random() * 0.6;
    const shifts = [];
    for (let dayOffset = -12; dayOffset <= 12; dayOffset++) {
      if (dayOffset !== 0 && random() > density) continue;
      const startMinutes = Math.floor(random() * 24) * 60 + [0, 15, 30, 45][Math.floor(random() * 4)];
      const endMinutes = startMinutes + 60 + Math.floor(random() * 11 * 60); // 1h .. 12h
      shifts.push(work(day(dayOffset), hhmm(startMinutes), hhmm(endMinutes % 1440), endMinutes >= 1440));
    }
    const planning = planningOf(shifts);
    // Deux vacations qui se chevauchent (impossible pour une personne) : la charge serait comptée deux fois, cas à part
    const overlapping = planning.some((a) => planning.some((b) => a !== b && a.start.epochMilliseconds < b.end.epochMilliseconds && b.start.epochMilliseconds < a.end.epochMilliseconds));
    if (overlapping) { overlappingPlannings++; continue; }
    const actual = rules(shifts, day(0));
    const expected = oracle(planning, day(0));
    if (actual.rest11 !== expected.rest11 || actual.rest35 !== expected.rest35 || actual.work48 !== expected.work48) {
      failures++;
      if (failureDetails.length < 3) failureDetails.push({ actual: { rest11: actual.rest11, rest35: actual.rest35, work48: actual.work48 }, expected, shifts: shifts.map((shift) => `${shift.date} ${shift.shift.name}`) });
    }
  }
  assert.equal(failures, 0, JSON.stringify(failureDetails, null, 1));
  assert.ok(overlappingPlannings < 3000);
});

test('R3 48h : deux vacations qui se chevauchent sont comptées deux fois (charge surestimée)', { todo: true }, () => {
  // 6 x 8h = 48h, mais une vacation de 3h recouvre le jour 4 : le temps réellement travaillé reste 48h (pas 51h)
  const planning = withZonedBounds([...series(0, 6, '06:00', '14:00'), work(day(4), '10:00', '13:00')], 'UTC');
  assert.equal(checkWeeklyWorkHours(planning, day(2), true).workOk, true);
});

// ─── R4 : jours de travail consécutifs ───────────────────────────────────────
test('R4 5 jours consécutifs : 5 accepté, 6 refusé, un jour de repos remet à zéro', () => {
  const five = checkConsecutiveWorkDays(planningOf(series(0, 5, '07:00', '15:00')), day(0));
  assert.deepEqual([five.ok, five.consecutiveDays], [true, 5]);
  assert.equal(checkConsecutiveWorkDays(planningOf(series(0, 6, '07:00', '15:00')), day(0)).ok, false);
  assert.equal(checkConsecutiveWorkDays(planningOf([...series(0, 4, '07:00', '15:00'), ...series(5, 4, '07:00', '15:00')]), day(0)).ok, true);
});

test('R4 5 jours consécutifs : une nuit à cheval sur deux dates compte pour un seul jour', () => {
  const planning = planningOf([...series(0, 4, '22:00', '06:00', true), work(day(4), '07:00', '15:00')]);
  assert.equal(checkConsecutiveWorkDays(planning, day(4)).consecutiveDays, 5);
});

test('R4 5 jours consécutifs : ne compte que la série qui contient la date cible', () => {
  // série de 6 jours très loin de la cible (day 8..13) : la cible (day 0) n'y est pour rien
  const planning = planningOf([work(day(0), '07:00', '15:00'), ...series(8, 6, '07:00', '15:00')]);
  assert.equal(checkConsecutiveWorkDays(planning, day(0)).ok, true);
});

// ─── Contrôle de nuit : travail entre 00h00 et 06h00 (heure du centre) ──────────────────────────────────────────────
const nightOf = (date, startTime, endTime, endsNextDay = false, timeZone = 'UTC') =>
  isNightControl(planningOf([work(date, startTime, endTime, endsNextDay)], timeZone)[0]);

test('Contrôle de nuit : toute vacation qui a une minute entre 00h00 et 06h00 en est un', () => {
  assert.equal(nightOf(day(0), '22:00', '06:00', true), true); // classique
  assert.equal(nightOf(day(0), '20:00', '04:00', true), true); // finit avant 06h
  assert.equal(nightOf(day(0), '02:00', '10:00'), true); // commence après minuit
  assert.equal(nightOf(day(0), '05:59', '14:00'), true); // une minute dans la plage
  assert.equal(nightOf(day(0), '00:00', '08:00'), true);
  assert.equal(nightOf(day(0), '23:00', '01:00', true), true); // à cheval sur minuit
  assert.equal(nightOf(day(0), '16:00', '00:01', true), true); // une minute après minuit
});

test('Contrôle de nuit : les bornes 06h00 et 00h00 ne comptent pas', () => {
  assert.equal(nightOf(day(0), '06:00', '14:00'), false); // commence à 06h00 pile
  assert.equal(nightOf(day(0), '16:00', '00:00', true), false); // finit à minuit pile
  assert.equal(nightOf(day(0), '07:00', '15:00'), false);
  assert.equal(nightOf(day(0), '14:00', '22:00'), false);
});

test('Contrôle de nuit : vacation de durée nulle, jamais de nuit', () => {
  assert.equal(nightOf(day(0), '02:00', '02:00'), false);
});

test('Contrôle de nuit : le résultat ne dépend pas du fuseau du serveur', () => {
  const probe = (serverTimeZone) => {
    const code = `
      import { isNightControl } from './utils/shifts/nightControl.js';
      import { checkRestAfterNightControl } from './services/substitution/compatibility/categorizeDemand.js';
      import { withZonedBounds } from './utils/shifts/shiftTime.js';
      const shiftOf = (date, startTime, endTime, endsNextDay = false) => ({ shift: { type: 'work' }, date, startTime, endTime, endsNextDay });
      const [night, nextShift] = withZonedBounds([shiftOf('2026-03-10', '22:00', '06:00', true), shiftOf('2026-03-11', '14:00', '20:00')], 'UTC');
      console.log(JSON.stringify({ night: isNightControl(night), day: isNightControl(nextShift), rest: checkRestAfterNightControl([night, nextShift], '2026-03-10') }));
    `;
    return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], {
      cwd: new URL('..', import.meta.url), env: { ...process.env, TZ: serverTimeZone }, encoding: 'utf8',
    }));
  };
  for (const result of ['UTC', 'Europe/Paris', 'America/Los_Angeles', 'Pacific/Auckland'].map(probe)) {
    assert.equal(result.night, true);
    assert.equal(result.day, false);
    assert.equal(result.rest.ok, false); // 06:00 -> 14:00 = 8h < 12h
    assert.equal(result.rest.restAfterNightControl, 8 * 60);
  }
});

// ─── R5 : 12 h de repos après un contrôle de nuit ────────────────────────────────────────────────────────────────────
const restAfterNight = (shifts, date) => checkRestAfterNightControl(planningOf(shifts), date);

test('R5 12h après une nuit : 11h59 refusé, 12h pile accepté', () => {
  const night = work(day(0), '22:00', '06:00', true); // finit le jour 1 à 06:00
  assert.equal(restAfterNight([night, work(day(1), '17:59', '23:00')], day(0)).ok, false); // 11h59
  assert.equal(restAfterNight([night, work(day(1), '18:00', '23:00')], day(0)).ok, true); // 12h pile
  assert.equal(restAfterNight([work(day(0), '02:00', '10:00')], day(0)).ok, true); // seule : rien à contrôler
});

test('R5 12h après une nuit : 22:00-06:00 est une nuit (8h de repos avant 14:00 = refusé, 12h = accepté)', () => {
  const night = work(day(0), '22:00', '06:00', true);
  const early = restAfterNight([night, work(day(1), '14:00', '20:00')], day(0));
  assert.equal(early.ok, false);
  assert.equal(early.restAfterNightControl, 8 * 60);
  assert.equal(restAfterNight([night, work(day(1), '18:00', '23:00')], day(0)).ok, true);
});

test('R5 12h après une nuit : insérer la cible juste après une nuit raccourcit le repos de cette nuit', () => {
  // nuit 22:00-06:00 puis cible 14:00-20:00 le lendemain : la cible n'est pas une nuit mais la précédente l'est
  const night = work(day(0), '22:00', '06:00', true);
  assert.equal(restAfterNight([night, work(day(1), '14:00', '20:00')], day(1)).ok, false);
  assert.equal(restAfterNight([night, work(day(1), '18:00', '23:00')], day(1)).ok, true); // 12h : respecté
});

test('R5 12h après une nuit : sans nuit autour de la cible, rien à contrôler', () => {
  assert.deepEqual(restAfterNight([work(day(0), '07:00', '15:00'), work(day(1), '07:00', '15:00')], day(1)), { ok: true, restAfterNightControl: 0 });
});

test('R5 12h après une nuit : une cible qui n\'est pas « work » n\'est pas contrôlée', () => {
  const restDay = { ...work(day(0), '02:00', '10:00'), shift: { type: 'rest', name: 'R' } };
  assert.deepEqual(restAfterNight([restDay], day(0)), { ok: true, restAfterNightControl: 0 });
});

test('Planning : la cible doit y figurer', () => {
  assert.throws(() => restAfterNight([work(day(0), '07:00', '15:00')], day(5)), /absente du planning/);
});

// ─── R6 : au plus 2 contrôles de nuit consécutifs ───────────────────────────────────────────────────────────────────
const nightStreak = (shifts, date) => checkConsecutiveNightControls(planningOf(shifts), date);

test('R6 deux nuits consécutives : acceptées ; trois : refusées', () => {
  const two = nightStreak(series(0, 2, '22:00', '06:00', true), day(1));
  assert.deepEqual([two.ok, two.consecutiveNightControls], [true, 2]);
  const three = nightStreak(series(0, 3, '22:00', '06:00', true), day(1));
  assert.deepEqual([three.ok, three.consecutiveNightControls], [false, 3]);
});

test('R6 la série est comptée des deux côtés de la cible, et seulement les jours consécutifs', () => {
  assert.equal(nightStreak([...series(0, 2, '02:00', '10:00'), work(day(2), '02:00', '10:00')], day(2)).consecutiveNightControls, 3);
  // jour de repos entre les deux séries : la série de la cible reste à 2
  const split = nightStreak([...series(0, 2, '02:00', '10:00'), ...series(3, 2, '02:00', '10:00')], day(3));
  assert.deepEqual([split.ok, split.consecutiveNightControls], [true, 2]);
});

test('R6 un jour de vacation de jour au milieu interrompt la série', () => {
  const shifts = [work(day(0), '22:00', '06:00', true), work(day(1), '14:00', '20:00'), work(day(2), '22:00', '06:00', true)];
  assert.equal(nightStreak(shifts, day(2)).consecutiveNightControls, 1);
});

test('R6 seule la série qui contient la cible compte', () => {
  const farNights = series(8, 3, '22:00', '06:00', true); // 3 nuits loin de la cible
  const result = nightStreak([work(day(0), '22:00', '06:00', true), ...farNights], day(0));
  assert.deepEqual([result.ok, result.consecutiveNightControls], [true, 1]);
});

test('R6 une cible qui n\'est pas une nuit ne crée pas de série', () => {
  const result = nightStreak([...series(0, 2, '22:00', '06:00', true), work(day(2), '12:00', '18:00')], day(2));
  assert.deepEqual([result.ok, result.consecutiveNightControls], [true, 0]);
});

test('R6 la fonction ne lève plus de ReferenceError (known issue #13)', () => {
  assert.doesNotThrow(() => nightStreak(series(0, 3, '02:00', '10:00'), day(1)));
});

// ─── R7 : 48 h de repos après deux contrôles de nuit consécutifs ────────────────────────────────────────────────────
const restAfterTwoNights = (shifts, date) => checkRestAfterTwoNightControls(planningOf(shifts), date);

test('R7 48h après deux nuits : 30h refusé, 48h pile accepté', () => {
  const nights = series(0, 2, '02:00', '10:00'); // la seconde finit le jour 1 à 10:00
  assert.equal(restAfterTwoNights([...nights, work(day(2), '16:00', '20:00')], day(1)).ok, false); // 30h
  assert.equal(restAfterTwoNights([...nights, work(day(3), '10:00', '14:00')], day(1)).ok, true); // 48h pile
  assert.equal(restAfterTwoNights([...nights, work(day(3), '09:59', '14:00')], day(1)).ok, false); // 47h59
});

test('R7 48h après deux nuits : vaut aussi pour des nuits 22:00-06:00', () => {
  const nights = series(0, 2, '22:00', '06:00', true); // la seconde finit le jour 2 à 06:00
  assert.equal(restAfterTwoNights([...nights, work(day(3), '08:00', '16:00')], day(1)).ok, false); // 26h
  assert.equal(restAfterTwoNights([...nights, work(day(4), '06:00', '14:00')], day(1)).ok, true); // 48h
});

test('R7 48h après deux nuits : la cible qui suit la paire est contrôlée, une paire éloignée ne l\'est pas', () => {
  const nights = series(0, 2, '02:00', '10:00');
  assert.equal(restAfterTwoNights([...nights, work(day(2), '16:00', '20:00')], day(2)).ok, false); // la cible est la vacation qui suit
  const farPair = series(8, 2, '02:00', '10:00');
  assert.equal(restAfterTwoNights([work(day(0), '07:00', '15:00'), ...farPair, work(day(10), '16:00', '20:00')], day(0)).ok, true);
});

test('R7 48h après deux nuits : deux nuits non consécutives ne forment pas une paire', () => {
  const shifts = [work(day(0), '02:00', '10:00'), work(day(2), '02:00', '10:00'), work(day(3), '16:00', '20:00')];
  assert.equal(restAfterTwoNights(shifts, day(2)).ok, true);
});

// ─── Appel complet : categorize() ────────────────────────────────────────────
const demandOf = (posterShift, date) => ({
  _id: 'd1',
  posterShift: { ...posterShift, day: date, date: new Date(`${date}T00:00:00Z`) },
  acceptedSwitches: [],
  toObject() { return JSON.parse(JSON.stringify(this)); },
});

const mapOf = (shifts) => new Map(shifts.map((shift) => [shift.date, shift]));

test('categorize : limites 11h / 35h / 48h remontées, et alreadyWorking', async () => {
  const posterShift = { shift: { _id: 's1', name: 'M', type: 'work', default: { startTime: '07:00', endTime: '15:00', endsNextDay: false }, variations: [] }, selectedVariation: null };
  // l'utilisateur travaille déjà la veille jusqu'à 22:00 : 9h de repos
  const tired = await categorize(demandOf(posterShift, day(0)), mapOf([work(day(-1), '14:00', '22:00')]));
  assert.ok(tired.limit.includes('insufficientRest'));
  const free = await categorize(demandOf(posterShift, day(0)), mapOf([]));
  assert.deepEqual(free.limit, []);
  const busy = await categorize(demandOf(posterShift, day(0)), mapOf([work(day(0), '09:00', '17:00')]));
  assert.ok(busy.limit.includes('alreadyWorking'));
});

const shortShift = { _id: 's1', name: 'C', type: 'work', default: { startTime: '11:00', endTime: '13:00', endsNextDay: false }, variations: [] };
const withShift = (shift) => ({ shift, selectedVariation: null });

test('categorize : le 6e jour consécutif est signalé (consecutiveDaysLimit), le 5e non', async () => {
  // Vacations courtes 11:00-13:00 : 11h, 35h et 48h sont respectées
  const sixth = await categorize(demandOf(withShift(shortShift), day(0)), mapOf(series(-5, 5, '11:00', '13:00')));
  assert.deepEqual(sixth.limit, ['consecutiveDaysLimit']);
  const fifth = await categorize(demandOf(withShift(shortShift), day(0)), mapOf(series(-4, 4, '11:00', '13:00')));
  assert.deepEqual(fifth.limit, []);
});

test('categorize : repos < 12h après une nuit (nightControlRestLimit)', async () => {
  const afternoon = { ...shortShift, default: { startTime: '14:00', endTime: '20:00', endsNextDay: false } };
  // nuit 22:00-06:00 la veille : 8h de repos avant 14:00 ; l'11h est donc aussi enfreinte
  const tooEarly = await categorize(demandOf(withShift(afternoon), day(0)), mapOf([work(day(-1), '22:00', '06:00', true)]));
  assert.ok(tooEarly.limit.includes('nightControlRestLimit'));
  assert.ok(tooEarly.limit.includes('insufficientRest'));
  // 12h exactement : 18:00 (06:00 + 12h)
  const evening = { ...shortShift, default: { startTime: '18:00', endTime: '22:00', endsNextDay: false } };
  const rested = await categorize(demandOf(withShift(evening), day(0)), mapOf([work(day(-1), '22:00', '06:00', true)]));
  assert.ok(!rested.limit.includes('nightControlRestLimit'));
});

test('categorize : 3 nuits consécutives (consecutiveNightLimit)', async () => {
  const night = { ...shortShift, default: { startTime: '22:00', endTime: '06:00', endsNextDay: true } };
  const third = await categorize(demandOf(withShift(night), day(0)), mapOf(series(-2, 2, '22:00', '06:00', true)));
  assert.ok(third.limit.includes('consecutiveNightLimit'));
  const second = await categorize(demandOf(withShift(night), day(0)), mapOf(series(-1, 1, '22:00', '06:00', true)));
  assert.ok(!second.limit.includes('consecutiveNightLimit'));
});

test('categorize : moins de 48h après deux nuits consécutives (restAfterTwoNightsLimit)', async () => {
  const night = { ...shortShift, default: { startTime: '22:00', endTime: '06:00', endsNextDay: true } };
  // nuits aux jours -1 et 0 (cible), la suivante le jour 3 à 06:00 : la seconde finit le jour 1 à 06:00, soit 48h pile
  const exactly48h = await categorize(demandOf(withShift(night), day(0)), mapOf([work(day(-1), '22:00', '06:00', true), work(day(3), '06:00', '14:00')]));
  assert.ok(!exactly48h.limit.includes('restAfterTwoNightsLimit'), JSON.stringify(exactly48h.limit));
  const lessThan48h = await categorize(demandOf(withShift(night), day(0)), mapOf([work(day(-1), '22:00', '06:00', true), work(day(3), '05:59', '14:00')]));
  assert.ok(lessThan48h.limit.includes('restAfterTwoNightsLimit'), JSON.stringify(lessThan48h.limit));
});

test('categorize : sans les champs de variantes (ils sont optionnels, voir demandVariations.js)', async () => {
  const result = await categorize(demandOf(withShift(shortShift), day(0)), mapOf([]));
  for (const field of ['compatibleVariations', 'compatibleFetcherVariationsByDate', 'compatiblePairsByFetcherDate', 'potentiallyCompatible']) {
    assert.equal(field in result, false, field);
  }
});

// ─── Fuseau du centre ───────────────────────────────────────────────────────────────────────────────────────────────
// Changements d'heure à Paris en 2026 : 29 mars 02:00 -> 03:00 (nuit de 7h), 25 octobre 03:00 -> 02:00 (nuit de 9h).
const PARIS = 'Europe/Paris';
const zonedBoundsOf = (date, startTime, endTime, endsNextDay = false, timeZone = PARIS) =>
  withZonedBounds([{ date, startTime, endTime, endsNextDay }], timeZone)[0];

test('Fuseau : les heures d\'une vacation sont placées dans le fuseau du centre (hiver +1, été +2)', () => {
  assert.equal(zonedBoundsOf('2026-01-15', '22:00', '23:00').start.epochMilliseconds, Date.parse('2026-01-15T21:00:00Z'));
  assert.equal(zonedBoundsOf('2026-07-15', '22:00', '23:00').start.epochMilliseconds, Date.parse('2026-07-15T20:00:00Z'));
  assert.equal(zonedBoundsOf('2026-03-10', '22:00', '23:00', false, 'UTC').start.epochMilliseconds, Date.parse('2026-03-10T22:00:00Z'));
});

test('Fuseau : une heure absente (saut de printemps) est décalée, une heure double (automne) prend la première occurrence', () => {
  // 02:30 le 29 mars n'existe pas : 03:30 CEST = 01:30Z
  assert.equal(zonedBoundsOf('2026-03-29', '02:30', '04:00').start.epochMilliseconds, Date.parse('2026-03-29T01:30:00Z'));
  // 02:30 le 25 octobre existe deux fois : la première (CEST) = 00:30Z
  assert.equal(zonedBoundsOf('2026-10-25', '02:30', '04:00').start.epochMilliseconds, Date.parse('2026-10-25T00:30:00Z'));
});

test('Fuseau : une nuit 22:00-06:00 dure 7h au changement d\'heure de printemps, 9h à celui d\'automne, 8h sinon', () => {
  const hoursOfNight = (date) => {
    const { start, end } = zonedBoundsOf(date, '22:00', '06:00', true);
    return start.until(end, { largestUnit: 'hours' }).total({ unit: 'hours' });
  };
  assert.equal(hoursOfNight('2026-03-28'), 7);
  assert.equal(hoursOfNight('2026-10-24'), 9);
  assert.equal(hoursOfNight('2026-03-10'), 8);
});

test('Fuseau : le texte rendu au front est l\'heure du centre écrite avec un Z', () => {
  const { start, end } = zonedBoundsOf('2026-03-28', '22:00', '06:00', true);
  assert.equal(wallClockIso(start), '2026-03-28T22:00:00.000Z');
  assert.equal(wallClockIso(end), '2026-03-29T06:00:00.000Z');
});

test('Fuseau : le repos de 11h est mesuré en heures réelles (printemps : 11h murales = 10h réelles)', async () => {
  const afternoon = { _id: 'a', name: 'A', type: 'work', default: { startTime: '09:00', endTime: '17:00', endsNextDay: false }, variations: [] };
  // veille 14:00-22:00, cible 09:00-17:00 le 29 mars : 11h d'écart sur l'horloge murale, 10h réelles à Paris
  const previous = work('2026-03-28', '14:00', '22:00');
  const paris = await categorize(demandOf(withShift(afternoon), '2026-03-29'), mapOf([previous]), { timeZone: PARIS });
  assert.ok(paris.limit.includes('insufficientRest'));
  assert.equal(paris.rest.before, 10 * 60);
  const utc = await categorize(demandOf(withShift(afternoon), '2026-03-29'), mapOf([previous]), { timeZone: 'UTC' });
  assert.ok(!utc.limit.includes('insufficientRest'));
  assert.equal(utc.rest.before, 11 * 60);
});

test('Fuseau : retour d\'automne : 10h30 murales = 11h30 réelles, le repos est suffisant à Paris', async () => {
  const early = { _id: 'e', name: 'E', type: 'work', default: { startTime: '08:30', endTime: '16:00', endsNextDay: false }, variations: [] };
  const previous = work('2026-10-24', '14:00', '22:00');
  const paris = await categorize(demandOf(withShift(early), '2026-10-25'), mapOf([previous]), { timeZone: PARIS });
  assert.ok(!paris.limit.includes('insufficientRest'), JSON.stringify(paris.limit));
  assert.equal(paris.rest.before, 11 * 60 + 30);
  const utc = await categorize(demandOf(withShift(early), '2026-10-25'), mapOf([previous]), { timeZone: 'UTC' });
  assert.ok(utc.limit.includes('insufficientRest'));
});

test('Fuseau : les fenêtres renvoyées au front sont des minuits locaux écrits avec un Z (T00:00:00.000Z)', async () => {
  const dayShift = { _id: 's', name: 'J', type: 'work', default: { startTime: '07:00', endTime: '15:00', endsNextDay: false }, variations: [] };
  // 7 jours de travail d'affilée : aucune fenêtre de 7 jours n'a 35h de repos
  const result = await categorize(demandOf(withShift(dayShift), day(0)), mapOf(series(-6, 6, '07:00', '15:00')), { timeZone: PARIS });
  assert.ok(result.invalidRest35.length > 0);
  for (const window of result.invalidRest35) {
    assert.match(window.windowStart, /T00:00:00\.000Z$/);
    assert.match(window.windowEnd, /T00:00:00\.000Z$/);
    assert.match(window.longestRestStart, /Z$/);
  }
});

test('Fuseau : la plage 00h-06h d\'un contrôle de nuit est celle du jour LOCAL, y compris le jour du changement d\'heure', () => {
  assert.equal(nightOf('2026-01-15', '23:30', '07:30', true, PARIS), true);
  assert.equal(nightOf('2026-07-15', '06:00', '14:00', false, PARIS), false);
  assert.equal(nightOf('2026-03-29', '00:30', '03:30', false, PARIS), true); // la nuit du saut de printemps
  assert.equal(nightOf('2026-03-29', '06:00', '14:00', false, PARIS), false);
});
