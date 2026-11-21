/**
 * `presence`, `shiftData`, `substitution` et `history` d'un jour, de bout en bout par les vrais flux (création, acceptation,
 * permutation, désistement, annulation) sur une base jetable : un remplacement, une chaîne de remplacements, des permutations
 * chaînées, et le remplacement d'une vacation obtenue par permutation.
 *
 *   node --test backend/test/planningPresence.db.test.js
 *
 * Nécessite un MongoDB local en replica set (TEST_PRESENCE_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_presence),
 * supprimé à la fin. Sans MongoDB joignable, les tests sont ignorés.
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
import { computeUserShifts } from '../services/planning/planning.userShifts.js';
import { createDemand } from '../services/demand/demand.creation.js';
import { acceptDemand, swapShifts } from '../services/demand/demand.accept.js';
import { cancelDemand } from '../services/demand/demand.cancel.js';
import { withdrawFromDemand } from '../services/demand/demand.withdraw.js';
import { registerEntry } from '../services/calendarEntry/calendarEntry.register.js';

const URI = process.env.TEST_PRESENCE_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_presence';
let available = false;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_PRESENCE_MONGO_URI doit viser une base de test : ${URI}`);
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

/** Rotation de 5 jours (J, K, L, M, repos), un agent par équipe : aujourd'hui A fait J, B K, C L, D M, E et F se reposent */
async function setup () {
  const today = Temporal.Now.plainDateISO('Europe/Paris');
  const day = today.toString();
  const anchor = new Date(`${today}T00:00:00Z`);
  const center = await Center.create({ name: 'PR', OACI: 'TESTP', type: 'app', timeZone: 'Europe/Paris', cycleAnchorDate: anchor, cycleAnchorDay: day });
  const work = (name, order, start) => Shift.create({ name, order, type: 'work', default: { startTime: start, endTime: '18:00', points: 10 } });
  const [J, K, L, M] = [await work('J', 0, '06:00'), await work('K', 1, '07:00'), await work('L', 2, '08:00'), await work('M', 3, '09:00')];
  const R = await Shift.create({ name: 'R', order: 4, type: 'rest', default: { startTime: null, endTime: null, points: 0 } });
  await Rotation.create({
    name: 'rot', centerId: center._id, days: [J._id, K._id, L._id, M._id, R._id],
    activationDates: [anchor], activationDays: [day],
  });

  // Une équipe par position du cycle : l'équipe d'indice i est sur la vacation i aujourd'hui (décalage = (5 - i) % 5)
  const teams = [];
  for (let index = 0; index < 5; index++) {
    const offset = (5 - index) % 5;
    teams.push(await Team.create({ name: `T${index}`, center: center._id, cycleOffset: offset, cycleStartDate: new Date(`${today.add({ days: offset })}T00:00:00Z`) }));
  }
  const makeUser = (name, team) => User.create({
    name, lastName: name, email: `${name}@example.com`, password: 'x', centerId: center._id,
    teams: [{ teamId: team._id, fromDate: new Date('2020-01-01T00:00:00Z'), fromDay: '2020-01-01', toDate: null, toDay: null }],
  });
  const users = {
    A: await makeUser('A', teams[0]), B: await makeUser('B', teams[1]), C: await makeUser('C', teams[2]), D: await makeUser('D', teams[3]),
    E: await makeUser('E', teams[4]), F: await makeUser('F', teams[4]),
  };
  const post = (user, extra = {}) => createDemand({ posterId: user._id, posterShift: { date: day }, points: 0, acceptedSwitches: [], ...extra });
  const switchFor = (shift) => ({ isTrueSwitch: true, acceptedSwitches: [{ shift: shift._id, points: 0 }] });
  const dayOf = async (user) => (await computeUserShifts([day], user._id))[0];
  /** Résumé d'un jour : [présence, vacation tenue, nature de la substitution, vacation cédée, vacation de la rotation, travaillé] */
  const view = async (user) => {
    const result = await dayOf(user);
    return [
      result.presence,
      result.shiftData.shift?.name ?? null,
      result.substitution?.kind ?? null,
      result.substitution?.gave?.shift?.name ?? null,
      result.baseShift?.name ?? null,
      result.isWorked,
    ];
  };
  return { day, users, shifts: { J, K, L, M, R }, post, switchFor, dayOf, view };
}

test('remplacement : le remplacé ne tient plus rien, ce qu’il a cédé est dans substitution.gave', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { users: { A, E }, post, view, dayOf } = await setup();

  assert.deepEqual(await view(A), ['present', 'J', null, null, 'J', true]);
  const s1 = await post(A);
  await acceptDemand(s1._id, E._id);

  assert.deepEqual(await view(A), ['replaced', null, 'replaced', 'J', 'J', false]);   // plus de vacation, J cédée, rotation J
  assert.deepEqual(await view(E), ['present', 'J', 'replacing', null, 'R', true]);    // tient J, rotation repos

  const a = await dayOf(A);
  assert.equal(a.history.length, 1);
  assert.deepEqual([a.history[0].substitution.kind, String(a.history[0].substitution.demandId)], ['replaced', String(s1._id)]);

  await cancelDemand(s1._id);
  assert.deepEqual(await view(A), ['present', 'J', null, null, 'J', true]);
  assert.deepEqual(await view(E), ['present', 'R', null, null, 'R', false]);
});

test('chaîne A → E → F : E cède J (pas son repos), désistement et annulation rétablissent chacun', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { users: { A, E, F }, post, view, dayOf } = await setup();

  const s1 = await post(A);
  await acceptDemand(s1._id, E._id);
  const s2 = await post(E);                // E tient J par S1 : il peut la reposter
  await acceptDemand(s2._id, F._id);

  assert.deepEqual(await view(A), ['replaced', null, 'replaced', 'J', 'J', false]);
  assert.deepEqual(await view(E), ['replaced', null, 'replaced', 'J', 'R', false]);   // a cédé J, sa rotation est le repos
  assert.deepEqual(await view(F), ['present', 'J', 'replacing', null, 'R', true]);

  // L'historique d'E garde les deux pas : repris de A (S1), puis cédé à F (S2)
  const e = await dayOf(E);
  assert.deepEqual(e.history.map((step) => [step.substitution.kind, String(step.substitution.demandId)]), [['replacing', String(s1._id)], ['replaced', String(s2._id)]]);

  // F annule son acceptation (désistement) : E retrouve J
  await withdrawFromDemand(s2._id, F._id);
  assert.deepEqual(await view(E), ['present', 'J', 'replacing', null, 'R', true]);
  assert.deepEqual(await view(F), ['present', 'R', null, null, 'R', false]);

  // F reprend, puis A annule S1 : S2 (qui en dépend) est annulée avec, tous reviennent à leur rotation
  await acceptDemand(s2._id, F._id);
  await cancelDemand(s1._id);
  assert.deepEqual(await view(A), ['present', 'J', null, null, 'J', true]);
  assert.deepEqual(await view(E), ['present', 'R', null, null, 'R', false]);
  assert.deepEqual(await view(F), ['present', 'R', null, null, 'R', false]);
});

test('permutations A↔B, C↔D puis C↔A : chacun tient la vacation de l’autre, rien n’est « remplacé »', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { users: { A, B, C, D }, shifts: { K, M }, post, switchFor, view } = await setup();

  const s1 = await post(A, switchFor(K));
  await swapShifts(s1._id, B._id);
  const s2 = await post(C, switchFor(M));
  await swapShifts(s2._id, D._id);
  assert.deepEqual(await view(A), ['present', 'K', 'exchanged', 'J', 'J', true]);
  assert.deepEqual(await view(B), ['present', 'J', 'exchanged', 'K', 'K', true]);
  assert.deepEqual(await view(C), ['present', 'M', 'exchanged', 'L', 'L', true]);
  assert.deepEqual(await view(D), ['present', 'L', 'exchanged', 'M', 'M', true]);

  // C (qui tient M) et A (qui tient K) permutent : chacun cède ce qu'il tient, pas ce que sa rotation prévoyait
  const s3 = await post(C, switchFor(K));
  await swapShifts(s3._id, A._id);
  assert.deepEqual(await view(C), ['present', 'K', 'exchanged', 'M', 'L', true]);
  assert.deepEqual(await view(A), ['present', 'M', 'exchanged', 'K', 'J', true]);
  assert.deepEqual(await view(B), ['present', 'J', 'exchanged', 'K', 'K', true]);   // inchangé
  assert.deepEqual(await view(D), ['present', 'L', 'exchanged', 'M', 'M', true]);   // inchangé

  // Annuler la dernière permutation rend à C et à A ce que S2 et S1 leur avaient donné
  await cancelDemand(s3._id);
  assert.deepEqual(await view(C), ['present', 'M', 'exchanged', 'L', 'L', true]);
  assert.deepEqual(await view(A), ['present', 'K', 'exchanged', 'J', 'J', true]);
});

test('remplacer une vacation obtenue par permutation : le remplacé cède celle qu’il tient', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { users: { A, B, E }, shifts: { K }, post, switchFor, view } = await setup();

  const s1 = await post(A, switchFor(K));
  await swapShifts(s1._id, B._id);          // A tient K (rotation J)
  const s2 = await post(A);                 // A propose K en remplacement
  await acceptDemand(s2._id, E._id);

  assert.deepEqual(await view(A), ['replaced', null, 'replaced', 'K', 'J', false]);   // a cédé K, pas J
  assert.deepEqual(await view(E), ['present', 'K', 'replacing', null, 'R', true]);
  assert.deepEqual(await view(B), ['present', 'J', 'exchanged', 'K', 'K', true]);

  await cancelDemand(s2._id);
  assert.deepEqual(await view(A), ['present', 'K', 'exchanged', 'J', 'J', true]);
});

test('modifications : celui qui tient une vacation (accepteur, permutation) a sa présence ; le remplacé ne change rien', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, users: { A, B, E }, shifts: { J, K }, post, switchFor, view, dayOf } = await setup();
  // L'équipe est celle de la vacation tenue, comme la renvoie le front
  const modification = async (user, shift, entryType) => ({
    type: 'modification', entryType, shiftId: shift._id, teamId: (await dayOf(user)).shiftData.team?._id, date: day,
  });

  const s1 = await post(A);
  await acceptDemand(s1._id, E._id);
  await assert.rejects(registerEntry(A._id, day, await modification(A, J, 'pres')), { status: 422 });   // remplacé : rien à modifier
  await registerEntry(E._id, day, await modification(E, J, 'disp'));                                   // accepteur : libre
  assert.deepEqual(await view(E), ['released', 'J', 'replacing', null, 'R', false]);
  await registerEntry(E._id, day, await modification(E, J, 'pres'));
  assert.deepEqual(await view(E), ['present', 'J', 'replacing', null, 'R', true]);
  await cancelDemand(s1._id);

  const s2 = await post(A, switchFor(K));
  await swapShifts(s2._id, B._id);
  await registerEntry(A._id, day, await modification(A, K, 'disp'));                                   // permutation : chacun garde la main
  assert.deepEqual(await view(A), ['released', 'K', 'exchanged', 'J', 'J', false]);
});

test('affectation : horaires et commentaire saisis sont enregistrés, rendus sur le jour, et bornés', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, users: { E }, view, dayOf } = await setup();

  // Un commentaire trop long est refusé avant de toucher au jour
  await assert.rejects(registerEntry(E._id, day, {
    type: 'assignment', entryType: 'training', startTime: '09:00', endTime: '17:00', comment: 'x'.repeat(501),
  }), { status: 400 });
  assert.deepEqual(await view(E), ['present', 'R', null, null, 'R', false]);

  const { userShift: [result] } = await registerEntry(E._id, day, {
    type: 'assignment', entryType: 'training', startTime: '10:00', endTime: '12:30', comment: '  Formation sécurité  ',
  });
  assert.deepEqual([result.type, result.startTime, result.endTime, result.comment, result.isWorked], ['training', '10:00', '12:30', 'Formation sécurité', true]);
  assert.equal((await dayOf(E)).history[0].comment, 'Formation sécurité');

  // Sans commentaire : chaîne vide ; un congé n'est pas du travail
  const { userShift: [leave] } = await registerEntry(E._id, day, { type: 'assignment', entryType: 'absence', startTime: '09:00', endTime: '17:00' });
  assert.deepEqual([leave.type, leave.comment, leave.isWorked], ['absence', '', false]);
});
