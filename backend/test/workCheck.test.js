/**
 * Contrôle du temps de travail du calendrier (services/user/user.workCheck.js), partie calculée : temps travaillé par jour,
 * repos avant chaque vacation (11 h, 12 h après une nuit, 48 h après deux nuits) et périodes de 7 jours glissantes
 * (48 h de travail au plus, 35 h de repos continu au moins). Fonctions pures : pas de base de données.
 *
 *   node --test backend/test/workCheck.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Temporal } from '@js-temporal/polyfill';
import { analyzeWork } from '../services/user/user.workCheck.js';

const TZ = 'Europe/Paris';
const shift = (date, startTime, endTime, endsNextDay = false, name = 'X') => ({ date, startTime, endTime, endsNextDay, shift: { type: 'work', name } });
const addDays = (key, n) => new Date(Date.parse(`${key}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
/** Une vacation par jour, `count` jours de suite à partir de `first` */
const streak = (first, count, startTime, endTime) => Array.from({ length: count }, (_, i) => shift(addDays(first, i), startTime, endTime));
const run = (shifts, from, to) => analyzeWork({ shifts, timeZone: TZ, from, to });
const dayOf = (result, date) => result.days.find((d) => d.date === date);
const windowOf = (result, start) => result.windows.find((w) => w.start === start);

test('temps travaillé : une vacation compte pour le jour où elle commence, une nuit en entier', () => {
  const result = run([shift('2027-03-02', '06:15', '14:00'), shift('2027-03-04', '19:15', '06:15', true)], '2027-03-01', '2027-03-06');
  assert.equal(dayOf(result, '2027-03-01').workedMinutes, 0);
  assert.equal(dayOf(result, '2027-03-02').workedMinutes, 7 * 60 + 45);
  assert.equal(dayOf(result, '2027-03-04').workedMinutes, 11 * 60);      // 19:15 → 06:15, comptée le 4
  assert.equal(dayOf(result, '2027-03-05').workedMinutes, 0);
  assert.deepEqual(dayOf(result, '2027-03-04').shifts, [{ name: 'X', startTime: '19:15', endTime: '06:15', endsNextDay: true }]);
});

test('temps travaillé : durée réelle un jour de changement d\'heure (nuit du passage à l\'heure d\'été)', () => {
  // 2027-03-28, 02:00 → 03:00 à Paris : une nuit 22:00 → 06:00 ne dure que 7 h
  const result = run([shift('2027-03-27', '22:00', '06:00', true)], '2027-03-26', '2027-03-29');
  assert.equal(dayOf(result, '2027-03-27').workedMinutes, 7 * 60);
});

test('repos avant une vacation : 11 h exigées, la frontière est acceptée', () => {
  const tired = run([shift('2027-03-02', '14:00', '22:00'), shift('2027-03-03', '06:00', '14:00')], '2027-03-02', '2027-03-03');
  assert.equal(dayOf(tired, '2027-03-02').rest, null);                   // pas de vacation avant la première
  assert.deepEqual(dayOf(tired, '2027-03-03').rest, { minutes: 8 * 60, requiredMinutes: 11 * 60, ok: false, from: '2027-03-02T22:00', to: '2027-03-03T06:00' });

  const exact = run([shift('2027-03-02', '14:00', '22:00'), shift('2027-03-03', '09:00', '17:00')], '2027-03-02', '2027-03-03');
  assert.equal(dayOf(exact, '2027-03-03').rest.minutes, 11 * 60);
  assert.equal(dayOf(exact, '2027-03-03').rest.ok, true);
});

test('repos après un contrôle de nuit : 12 h ; après deux nuits consécutives : 48 h', () => {
  const afterNight = (nextStart) => run([shift('2027-03-02', '22:00', '06:00', true), shift('2027-03-03', nextStart, '20:00')], '2027-03-02', '2027-03-03');
  assert.deepEqual([dayOf(afterNight('17:00'), '2027-03-03').rest.requiredMinutes, dayOf(afterNight('17:00'), '2027-03-03').rest.ok], [12 * 60, false]);   // 11 h après la nuit
  assert.equal(dayOf(afterNight('18:00'), '2027-03-03').rest.ok, true);                                                                                  // 12 h pile

  const twoNights = (nextDay, nextStart) => run([shift('2027-03-02', '22:00', '06:00', true), shift('2027-03-03', '22:00', '06:00', true), shift(nextDay, nextStart, '20:00')], '2027-03-02', nextDay);
  const tooSoon = twoNights('2027-03-04', '18:00');     // 36 h après la deuxième nuit
  assert.deepEqual([dayOf(tooSoon, '2027-03-04').rest.requiredMinutes, dayOf(tooSoon, '2027-03-04').rest.ok], [48 * 60, false]);
  assert.equal(dayOf(twoNights('2027-03-06', '06:00'), '2027-03-06').rest.ok, true);
});

test('repos : on garde la vacation du jour qui a le moins de marge', () => {
  const result = run([shift('2027-03-02', '06:00', '12:00'), shift('2027-03-02', '14:00', '18:00'), shift('2027-03-03', '04:00', '10:00')], '2027-03-02', '2027-03-03');
  // le 3 : repos de 10 h après la vacation de 18:00, c'est la seule vacation du jour
  assert.equal(dayOf(result, '2027-03-03').rest.minutes, 10 * 60);
  // le 2 : 2 h entre les deux vacations (la plus défavorable)
  assert.deepEqual([dayOf(result, '2027-03-02').rest.minutes, dayOf(result, '2027-03-02').rest.ok], [2 * 60, false]);
});

test('périodes de 7 jours : toutes celles qui chevauchent la période, de from - 6 à to', () => {
  const result = run([], '2027-03-10', '2027-03-20');
  assert.equal(result.windows.length, 11 + 6);
  assert.equal(result.windows[0].start, '2027-03-04');
  assert.equal(result.windows.at(-1).start, '2027-03-20');
  assert.equal(windowOf(result, '2027-03-10').end, '2027-03-16');
});

test('48 h : 6 jours de 8 h = 48 h passent, 6 jours de 9 h = 54 h non', () => {
  const ok = run(streak('2027-03-08', 6, '08:00', '16:00'), '2027-03-08', '2027-03-14');
  assert.deepEqual([windowOf(ok, '2027-03-08').workMinutes, windowOf(ok, '2027-03-08').workOk], [48 * 60, true]);
  const heavy = run(streak('2027-03-08', 6, '08:00', '17:00'), '2027-03-08', '2027-03-14');
  assert.deepEqual([windowOf(heavy, '2027-03-08').workMinutes, windowOf(heavy, '2027-03-08').workOk], [54 * 60, false]);
});

test('35 h : un week-end libre suffit, sept jours de travail non', () => {
  const week = run(streak('2027-03-08', 5, '08:00', '16:00'), '2027-03-08', '2027-03-14');   // lundi → vendredi
  const monday = windowOf(week, '2027-03-08');
  assert.equal(monday.restOk, true);
  assert.equal(monday.longestRestFrom, '2027-03-12T16:00');                // vendredi 16:00
  assert.equal(monday.longestRestTo, '2027-03-15T00:00');                  // jusqu'à la fin de la période (bornée)
  assert.equal(monday.longestRestMinutes, 56 * 60);

  const nonStop = run(streak('2027-03-08', 7, '08:00', '16:00'), '2027-03-08', '2027-03-14');
  const window = windowOf(nonStop, '2027-03-08');
  assert.deepEqual([window.restOk, window.longestRestMinutes], [false, 16 * 60]);
});

test('35 h : le repos est borné par la période (comportement voulu, identique à la compatibilité)', () => {
  // lundi → vendredi, 64 h de repos le week-end : la période qui commence le dimanche n'en contient que 31 h + 33 h
  const result = run(streak('2027-03-08', 5, '08:00', '16:00').concat(streak('2027-03-15', 5, '08:00', '16:00')), '2027-03-08', '2027-03-21');
  assert.equal(windowOf(result, '2027-03-14').restOk, false);
  assert.ok(windowOf(result, '2027-03-14').longestRestMinutes < 35 * 60);
});

// ── isWorked : ce qui compte comme travail (planning.userShifts.js) ──────────────────────────────

const day = Temporal.PlainDate.from('2027-03-10');
const today = Temporal.PlainDate.from('2027-03-10');
const shiftId = new mongoose.Types.ObjectId();
const work = { _id: shiftId, name: 'J4', type: 'work', default: { startTime: '08:00', endTime: '16:00' } };
const rest = { _id: new mongoose.Types.ObjectId(), name: 'R', type: 'rest', default: {} };
const resolved = async (base, { assignments = [], modifications = [], on = day } = {}) => {
  const { applyEntries } = await import('../services/planning/planning.userShifts.js');
  return applyEntries({ shift: base, team: null }, assignments, modifications, [], { day: on, today }).resolvedShift;
};
const worked = async (...args) => (await resolved(...args)).isWorked;
const vic = { subType: 'vic', shiftData: { shift: work, team: null } };

test("isWorked : une vacation de travail l'est, un repos non", async () => {
  assert.equal(await worked(work, { modifications: [{ subType: 'pres', shiftData: { shift: work } }] }), true);
  assert.equal(await worked(rest), false);
});

test("isWorked : un VIC l'est seulement s'il n'est pas passé", async () => {
  assert.equal(await worked(work, { modifications: [vic], on: day }), true);
  assert.equal(await worked(work, { modifications: [vic], on: Temporal.PlainDate.from('2027-03-09') }), false);
  assert.equal(await worked(work, { modifications: [vic], on: Temporal.PlainDate.from('2027-03-11') }), true);
});

test("isWorked : un jour facultatif de la rotation ne l'est que s'il est confirmé (présent, variante ou VIC)", async () => {
  const optional = { ...work, optional: true };
  const variation = { subType: 'variation', shiftData: { shift: optional, selectedVariation: { startTime: '09:00', endTime: '17:00' } } };
  assert.equal(await worked(optional), false);                                                              // rien ne le confirme
  assert.equal(await worked(optional, { modifications: [{ subType: 'pres', shiftData: { shift: optional } }] }), true);
  assert.equal(await worked(optional, { modifications: [variation] }), true);                               // choisir une variante, c'est y aller
  assert.equal(await worked(optional, { modifications: [{ subType: 'vic', shiftData: { shift: optional } }] }), true);
  assert.equal(await worked(optional, { modifications: [{ subType: 'disp', shiftData: { shift: optional } }] }), false);   // dispo : non
});

test("presence : un jour facultatif sans rien pour le confirmer est unconfirmed ; présent, variante ou VIC le confirment ; dispo = released ; une absence reste présente (elle remplace la vacation)", async () => {
  const optional = { ...work, optional: true };
  const variation = { subType: 'variation', shiftData: { shift: optional, selectedVariation: { startTime: '09:00', endTime: '17:00' } } };
  const presence = async (...args) => (await resolved(...args)).presence;
  assert.equal(await presence(optional), 'unconfirmed');
  assert.equal(await presence(optional, { modifications: [variation] }), 'present');
  assert.equal(await presence(optional, { modifications: [{ subType: 'vic', shiftData: { shift: optional } }] }), 'present');
  assert.equal(await presence(optional, { modifications: [{ subType: 'pres', shiftData: { shift: optional } }] }), 'present');
  assert.equal(await presence(work, { modifications: [{ subType: 'disp', shiftData: { shift: work } }] }), 'released');
  assert.equal(await presence(work, { assignments: [{ subType: 'absence' }] }), 'present');
  assert.equal(await presence(work), 'present');
});

const demandId = new mongoose.Types.ObjectId();
const other = { _id: new mongoose.Types.ObjectId(), name: 'K4', type: 'work', default: { startTime: '10:00', endTime: '18:00' } };

test("substitution : un remplacé ne tient plus de vacation (shiftData vide), la vacation cédée est dans substitution.gave", async () => {
  // Entrée sans `gave` (créée avant ce champ) : il cède celle de la rotation
  const legacy = await resolved(work, { assignments: [{ subType: 'substitution', substitution: { id: demandId } }] });
  assert.equal(legacy.presence, 'replaced');
  assert.equal(legacy.shiftData.shift, null);
  assert.equal(legacy.isWorked, false);
  assert.equal(legacy.baseShift, work);
  assert.deepEqual([legacy.substitution.kind, legacy.substitution.demandId, legacy.substitution.gave.shift], ['replaced', demandId, work]);

  // Chaîne : B (rotation = repos) a repris J de A puis l'a cédé à C : ce qu'il a cédé est J, pas son repos
  const chained = await resolved(rest, { assignments: [
    { subType: 'substitution', shiftData: { shift: work, team: null }, substitution: { id: new mongoose.Types.ObjectId() } },
    { subType: 'substitution', substitution: { id: demandId, gave: { shift: work, team: null } } },
  ] });
  assert.equal(chained.presence, 'replaced');
  assert.equal(chained.baseShift, rest);
  assert.equal(chained.substitution.gave.shift, work);
});

test("substitution : une modification (présent, dispo...) ne rend rien à un remplacé ; celui qui tient une vacation la modifie", async () => {
  const replaced = { subType: 'substitution', substitution: { id: demandId, gave: { shift: work } } };
  const pres = { subType: 'pres', shiftData: { shift: work } };
  assert.equal((await resolved(work, { assignments: [replaced], modifications: [pres] })).presence, 'replaced');

  const holder = { subType: 'substitution', shiftData: { shift: work, team: null }, substitution: { id: demandId } };
  const disp = { subType: 'disp', shiftData: { shift: work } };
  const result = await resolved(rest, { assignments: [holder], modifications: [disp] });
  assert.deepEqual([result.presence, result.isWorked, result.substitution.kind], ['released', false, 'replacing']);
});

test("substitution : une permutation est `exchanged` des deux côtés, chacun tient la vacation de l'autre", async () => {
  const swapped = async (took, gave) => resolved(rest, { assignments: [{
    subType: 'substitution', shiftData: { shift: took, team: null }, substitution: { id: demandId, gave: { shift: gave } },
  }] });
  const poster = await swapped(other, work);
  assert.deepEqual([poster.presence, poster.shiftData.shift, poster.substitution.kind, poster.substitution.gave.shift], ['present', other, 'exchanged', work]);
  assert.equal(poster.isWorked, true);
  const accepter = await swapped(work, other);
  assert.deepEqual([accepter.shiftData.shift, accepter.substitution.kind, accepter.substitution.gave.shift], [work, 'exchanged', other]);
});

test('isWorked : affectation = type à part, travaillée sauf congé / absence / substitution, aux horaires saisis', async () => {
  const { toShiftsMap } = await import('../services/planning/planning.shiftsMap.js');
  const { applyEntries } = await import('../services/planning/planning.userShifts.js');
  const resolve = (subType) => ({
    date: '2027-03-10',
    ...applyEntries({ shift: rest, team: null }, [{ subType, startTime: '09:00', endTime: '17:00' }], [], [], { day, today }).resolvedShift,
  });
  const map = toShiftsMap([resolve('training')]);
  assert.equal(map.get('2027-03-10').shift, null);
  assert.equal(map.get('2027-03-10').assignment, 'training');
  assert.equal(resolve('training').shiftData.shift, null);
  assert.equal(resolve('substitution').shiftData.shift, null);
  assert.equal(map.get('2027-03-10').startTime, '09:00');
  for (const leave of ['sick_leave', 'maternity_leave', 'absence', 'substitution']) {
    assert.equal(toShiftsMap([resolve(leave)]).size, 0, leave);
  }
});
