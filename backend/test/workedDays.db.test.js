/**
 * `isWorked` de bout en bout (computeUserShifts + toShiftsMap) sur une base jetable : un VIC passé ou à venir, un jour
 * facultatif confirmé ou non, une affectation travaillée, un congé et un arrêt maladie.
 *
 *   node --test backend/test/workedDays.db.test.js
 *
 * Nécessite un MongoDB local (TEST_WORKED_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_worked), supprimé à
 * la fin. Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Temporal } from '@js-temporal/polyfill';
import Center from '../models/Center.js';
import Team from '../models/Team.js';
import Shift from '../models/Shift.js';
import Rotation from '../models/Rotation.js';
import User from '../models/User.js';
import '../models/Variation.js';
import { Assignment, Modification } from '../models/CalendarEntry.js';
import { computeUserShifts } from '../services/planning/planning.userShifts.js';
import { toShiftsMap } from '../services/planning/planning.shiftsMap.js';

const URI = process.env.TEST_WORKED_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_worked';
let available = false;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_WORKED_MONGO_URI doit viser une base de test : ${URI}`);
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 2500 });
    await mongoose.connection.dropDatabase();
    available = true;
  } catch {
    available = false;
  }
});

after(async () => {
  if (available) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('isWorked : VIC passé / à venir, jour facultatif, affectation, congé et arrêt maladie', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');

  // Cycle de 3 jours qui commence aujourd'hui : J (travail), O (travail facultatif), R (repos), puis J...
  const today = Temporal.Now.plainDateISO('Europe/Paris');
  const at = (offset) => today.add({ days: offset }).toString();
  const center = await Center.create({
    name: 'C', OACI: 'TEST', type: 'app', timeZone: 'Europe/Paris',
    cycleAnchorDate: new Date(`${today}T00:00:00Z`), cycleAnchorDay: today.toString(),
  });
  const team = await Team.create({ name: '1', center: center._id, cycleOffset: 0, cycleStartDate: new Date(`${today}T00:00:00Z`) });
  const work = await Shift.create({ name: 'J', order: 0, type: 'work', default: { startTime: '08:00', endTime: '16:00', points: 10 } });
  const optional = await Shift.create({ name: 'O', order: 1, type: 'work', optional: true, default: { startTime: '08:00', endTime: '16:00', points: 10 } });
  const rest = await Shift.create({ name: 'R', order: 2, type: 'rest', default: { startTime: null, endTime: null, points: 0 } });
  await Rotation.create({
    name: 'rot', centerId: center._id, days: [work._id, optional._id, rest._id],
    activationDates: [new Date(`${today}T00:00:00Z`)], activationDays: [today.toString()],
  });
  const user = await User.create({
    name: 'Test', lastName: 'User', email: 'worked@example.com', password: 'x', centerId: center._id,
    teams: [{ teamId: team._id, fromDate: new Date('2020-01-01T00:00:00Z'), fromDay: '2020-01-01', toDate: null, toDay: null }],
  });

  const base = { userId: user._id, centerId: center._id };
  const modify = (offset, subType, shift) => Modification.create({ ...base, date: at(offset), subType, shiftData: { shift: shift._id, team: team._id } });
  const assign = (offset, subType, times = { startTime: '09:00', endTime: '17:00' }) => Assignment.create({ ...base, date: at(offset), subType, ...times });

  await modify(-3, 'vic', work);      // J passé en VIC : compté comme off
  await modify(3, 'vic', work);       // J à venir en VIC : travaillé
  await modify(4, 'pres', optional);  // O confirmé : travaillé (O du lendemain de J+3 sans rien : non)
  await assign(5, 'training');        // repos + formation : travaillé
  await assign(2, 'absence');         // congé : non
  await assign(6, 'sick_leave');      // arrêt maladie : non

  const offsets = [-3, 0, 1, 2, 3, 4, 5, 6, 7];
  const map = toShiftsMap(await computeUserShifts(offsets.map(at), user._id));
  const state = Object.fromEntries(offsets.map((offset) => [offset, map.has(at(offset))]));

  assert.deepEqual(state, {
    '-3': false,  // VIC passé
    0: true,      // J
    1: false,     // O facultatif non confirmé
    2: false,     // congé
    3: true,      // VIC à venir
    4: true,      // O confirmé par « présent »
    5: true,      // affectation travaillée sur un repos
    6: false,     // arrêt maladie
    7: false,     // O facultatif non confirmé
  });
  assert.equal(map.get(at(5)).assignment, 'training');
  assert.equal(map.get(at(5)).shift, null);
});
