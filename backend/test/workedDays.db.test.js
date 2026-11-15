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
import { createDemand } from '../services/substitution/request.creation.js';
import { addSubstitutionEntries, registerEntry } from '../services/calendarEntry/calendarEntry.register.js';
import { swapShifts } from '../services/substitution/request.accept.js';
import Substitution from '../models/Substitution.js';

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

test('createDemand : refusé sur un repos, un jour facultatif ou une vacation déjà cédée (S1), sans modification sur un jour remplacé (S2)', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');

  // Cycle de 3 jours qui commence aujourd'hui : J (travail), O (travail facultatif), R (repos)
  const today = Temporal.Now.plainDateISO('Europe/Paris');
  const at = (offset) => today.add({ days: offset }).toString();
  const center = await Center.create({
    name: 'C2', OACI: 'TEST2', type: 'app', timeZone: 'Europe/Paris',
    cycleAnchorDate: new Date(`${today}T00:00:00Z`), cycleAnchorDay: today.toString(),
  });
  const team = await Team.create({ name: '2', center: center._id, cycleOffset: 0, cycleStartDate: new Date(`${today}T00:00:00Z`) });
  const work = await Shift.create({ name: 'J2', order: 0, type: 'work', default: { startTime: '08:00', endTime: '16:00', points: 10 } });
  const optional = await Shift.create({ name: 'O2', order: 1, type: 'work', optional: true, default: { startTime: '08:00', endTime: '16:00', points: 10 } });
  const rest = await Shift.create({ name: 'R2', order: 2, type: 'rest', default: { startTime: null, endTime: null, points: 0 } });
  await Rotation.create({
    name: 'rot2', centerId: center._id, days: [work._id, optional._id, rest._id],
    activationDates: [new Date(`${today}T00:00:00Z`)], activationDays: [today.toString()],
  });
  const makeUser = (email) => User.create({
    name: 'Test', lastName: email, email, password: 'x', centerId: center._id,
    teams: [{ teamId: team._id, fromDate: new Date('2020-01-01T00:00:00Z'), fromDay: '2020-01-01', toDate: null, toDay: null }],
  });
  const poster = await makeUser('poster@example.com');
  const accepter = await makeUser('accepter@example.com');
  const post = (userId, offset) => createDemand({ posterId: userId, posterShift: { date: at(offset) }, points: 0, acceptedSwitches: [] });
  const refused = { status: 422 };

  await assert.rejects(post(poster._id, 1), refused);  // facultatif non confirmé
  await assert.rejects(post(poster._id, 2), refused);  // repos

  // A poste le jour de travail, B accepte : A est remplacé
  const demand = await post(poster._id, 0);
  demand.accepterId = accepter._id;
  demand.status = 'accepted';
  await demand.save();
  await addSubstitutionEntries(demand);

  await assert.rejects(post(poster._id, 0), refused);   // A ne tient plus la vacation

  // S2 : ni « présent » ni autre modification, ni horaires, sur le jour remplacé (A) ; B, qui tient la vacation, est libre
  const modification = { type: 'modification', entryType: 'pres', shiftId: work._id, teamId: team._id };
  const hourPatch = { type: 'hourPatch', shiftId: work._id, teamId: team._id, startTime: '09:00', endTime: '17:00' };
  await assert.rejects(registerEntry(poster._id, at(0), modification), refused);
  await assert.rejects(registerEntry(poster._id, at(0), hourPatch), refused);
  await registerEntry(accepter._id, at(0), hourPatch);  // l'accepteur peut ajuster ses horaires

  const chained = await post(accepter._id, 0);          // B, qui la tient, peut la reposter (chaîne)
  assert.equal(chained.status, 'open');
  assert.equal(await Substitution.countDocuments({ posterId: poster._id }), 1);

  await registerEntry(accepter._id, at(0), { ...modification, entryType: 'disp' });  // et se mettre en dispo
});

test('permutation : chacun prend la vacation de l’autre, et peut la modifier (S5, S6)', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');

  // Deux équipes décalées : aujourd'hui l'équipe 1 fait J, l'équipe 2 fait K
  const today = Temporal.Now.plainDateISO('Europe/Paris');
  const at = (offset) => today.add({ days: offset }).toString();
  const center = await Center.create({
    name: 'C3', OACI: 'TEST3', type: 'app', timeZone: 'Europe/Paris',
    cycleAnchorDate: new Date(`${today}T00:00:00Z`), cycleAnchorDay: today.toString(),
  });
  const team1 = await Team.create({ name: 'T1', center: center._id, cycleOffset: 0, cycleStartDate: new Date(`${today}T00:00:00Z`) });
  const team2 = await Team.create({ name: 'T2', center: center._id, cycleOffset: 2, cycleStartDate: new Date(`${today.add({ days: 2 })}T00:00:00Z`) });
  const shiftJ = await Shift.create({ name: 'J3', order: 0, type: 'work', default: { startTime: '08:00', endTime: '16:00', points: 10 } });
  const shiftK = await Shift.create({ name: 'K3', order: 1, type: 'work', default: { startTime: '10:00', endTime: '18:00', points: 10 } });
  const shiftR = await Shift.create({ name: 'R3', order: 2, type: 'rest', default: { startTime: null, endTime: null, points: 0 } });
  await Rotation.create({
    name: 'rot3', centerId: center._id, days: [shiftJ._id, shiftK._id, shiftR._id],
    activationDates: [new Date(`${today}T00:00:00Z`)], activationDays: [today.toString()],
  });
  const makeUser = (email, team) => User.create({
    name: 'Test', lastName: email, email, password: 'x', centerId: center._id,
    teams: [{ teamId: team._id, fromDate: new Date('2020-01-01T00:00:00Z'), fromDay: '2020-01-01', toDate: null, toDay: null }],
  });
  const poster = await makeUser('poster3@example.com', team1);
  const accepter = await makeUser('accepter3@example.com', team2);
  const dayOf = async (user) => (await computeUserShifts([at(0)], user._id))[0];

  assert.equal((await dayOf(poster)).shiftData.shift.name, 'J3');
  assert.equal((await dayOf(accepter)).shiftData.shift.name, 'K3');

  // A (J) propose une permutation contre K ; un agent qui n'a pas K ne peut pas l'accepter
  const demand = await createDemand({
    posterId: poster._id, posterShift: { date: at(0) }, points: 0,
    acceptedSwitches: [{ shift: shiftK._id, points: 0 }], isTrueSwitch: true,
  });
  assert.equal(demand.type, 'switch');
  const stranger = await makeUser('stranger3@example.com', team1);
  await assert.rejects(swapShifts(demand._id, stranger._id), { status: 400 });

  // B (K) accepte : S6, plus d'erreur ; S5, A reçoit K et B reçoit J
  const { shift: accepterDay } = await swapShifts(demand._id, accepter._id);
  assert.equal(accepterDay.shiftData.shift.name, 'J3');

  const [posterDay, newAccepterDay] = [await dayOf(poster), await dayOf(accepter)];
  assert.equal(posterDay.shiftData.shift.name, 'K3');
  assert.equal(posterDay.isWorked, true);
  assert.equal(posterDay.isOff, false);
  assert.equal(newAccepterDay.shiftData.shift.name, 'J3');
  assert.equal(newAccepterDay.isWorked, true);

  const saved = await Substitution.findById(demand._id);
  assert.equal(saved.status, 'accepted');
  assert.equal(saved.accepterShift.day, at(0));

  // Une permutation peut recevoir une modification et un ajustement d'horaires, pour chacun
  const modification = { type: 'modification', entryType: 'pres', shiftId: shiftK._id, teamId: team2._id };
  await registerEntry(poster._id, at(0), modification);
  await registerEntry(accepter._id, at(0), {
    type: 'hourPatch', shiftId: shiftJ._id, teamId: team1._id, startTime: '09:00', endTime: '17:00',
  });
});
