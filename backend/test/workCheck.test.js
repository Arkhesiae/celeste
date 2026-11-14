/**
 * Contrôle du temps de travail du calendrier (services/user/user.workCheck.js), partie calculée : temps travaillé par jour,
 * repos avant chaque vacation (11 h, 12 h après une nuit, 48 h après deux nuits) et périodes de 7 jours glissantes
 * (48 h de travail au plus, 35 h de repos continu au moins). Fonctions pures : pas de base de données.
 *
 *   node --test backend/test/workCheck.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
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
