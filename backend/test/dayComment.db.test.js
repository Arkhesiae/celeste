/**
 * Note d'un jour du calendrier (`DayComment`) : un commentaire indépendant de la vacation et de toute entrée du jour. Elle n'est pas
 * annulée avec une affectation, ne gêne aucune modification, se remplace, se supprime (commentaire vide), et la validation refuse
 * ce qui dépasse la limite sans rien enregistrer.
 *
 *   node --test backend/test/dayComment.db.test.js
 *
 * Nécessite un MongoDB local en replica set (TEST_DAYCOMMENT_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_daycomment),
 * supprimé à la fin. Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import { Temporal } from '@js-temporal/polyfill';
import Center from '../models/Center.js';
import Team from '../models/Team.js';
import Shift from '../models/Shift.js';
import Rotation from '../models/Rotation.js';
import User from '../models/User.js';
import DayComment from '../models/DayComment.js';
import { Assignment } from '../models/CalendarEntry.js';
import '../models/Variation.js';
import { CALENDAR_COMMENT_MAX_LENGTH } from '../config/limits.js';
import { computeUserShifts } from '../services/planning/planning.userShifts.js';
import { registerEntry } from '../services/calendarEntry/calendarEntry.register.js';
import { setDayComment, deleteAssignment, restoreInitialShift } from '../services/calendarEntry/index.js';
import routes from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { generateAccessToken } from '../services/auth/auth.refreshToken.js';

const URI = process.env.TEST_DAYCOMMENT_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_daycomment';
let available = false;
let server;
let base;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_DAYCOMMENT_MONGO_URI doit viser une base de test : ${URI}`);
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 2500 });
    await mongoose.connection.dropDatabase();
    available = true;
  } catch {
    available = false;
    return;
  }
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  app.use(errorHandler);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (available) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

/** Un agent qui fait la vacation J aujourd'hui (rotation de deux jours : J, repos), et un autre pour vérifier l'isolation */
async function setup() {
  const today = Temporal.Now.plainDateISO('Europe/Paris');
  const day = today.toString();
  const otherDay = today.add({ days: 1 }).toString();
  const anchor = new Date(`${today}T00:00:00Z`);
  const center = await Center.create({ name: 'DC', OACI: 'TESTD', type: 'app', timeZone: 'Europe/Paris', cycleAnchorDate: anchor, cycleAnchorDay: day });
  const J = await Shift.create({ name: 'J', order: 0, type: 'work', default: { startTime: '06:00', endTime: '18:00', points: 10 } });
  const R = await Shift.create({ name: 'R', order: 1, type: 'rest', default: { startTime: null, endTime: null, points: 0 } });
  await Rotation.create({ name: 'rot', centerId: center._id, days: [J._id, R._id], activationDates: [anchor], activationDays: [day] });
  const team = await Team.create({ name: 'T0', center: center._id, cycleOffset: 0, cycleStartDate: anchor });
  const makeUser = (name) =>
    User.create({
      name,
      lastName: name,
      email: `${name}@example.com`,
      password: 'x',
      centerId: center._id,
      teams: [{ teamId: team._id, fromDate: new Date('2020-01-01T00:00:00Z'), fromDay: '2020-01-01', toDate: null, toDay: null }],
    });
  const A = await makeUser('A');
  const B = await makeUser('B');
  const dayOf = async (user, date = day) => (await computeUserShifts([date], user._id))[0];
  return { day, otherDay, A, B, J, team, dayOf };
}

const office = (comment) => ({
  type: 'assignment',
  entryType: 'office',
  startTime: '09:00',
  endTime: '17:00',
  ...(comment !== undefined && { comment }),
});
const dispOn = (J, team) => ({ type: 'modification', entryType: 'disp', shiftId: J._id, teamId: team._id });

test('une note s’affiche sur le jour, sans rien changer à la vacation ni au travail', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, A, dayOf } = await setup();

  const before = await dayOf(A);
  assert.equal(before.comment, '');
  const result = await setDayComment(A._id, day, '  Penser à rendre le badge  ');

  assert.equal(result.userShift[0].comment, 'Penser à rendre le badge'); // rognée
  const after = await dayOf(A);
  assert.equal(after.comment, 'Penser à rendre le badge');
  assert.deepEqual(
    [after.presence, after.shiftData.shift.name, after.isWorked],
    [before.presence, before.shiftData.shift.name, before.isWorked],
  );
});

test('elle se remplace (un seul document) et se supprime avec un commentaire vide', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, A, dayOf } = await setup();

  await setDayComment(A._id, day, 'premier');
  await setDayComment(A._id, day, 'second');
  assert.equal((await dayOf(A)).comment, 'second');
  assert.equal(await DayComment.countDocuments({ userId: A._id, date: day }), 1);

  await setDayComment(A._id, day, '   '); // que des espaces : suppression
  assert.equal((await dayOf(A)).comment, '');
  assert.equal(await DayComment.countDocuments({ userId: A._id, date: day }), 0);
});

test('elle est propre à l’utilisateur et au jour', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, otherDay, A, B, dayOf } = await setup();

  await setDayComment(A._id, day, 'pour A, aujourd’hui');
  assert.equal((await dayOf(B)).comment, '');
  assert.equal((await dayOf(A, otherDay)).comment, '');
});

test('elle n’empêche pas une modification, et inversement', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, A, J, team, dayOf } = await setup();

  await setDayComment(A._id, day, 'note');
  await registerEntry(A._id, day, dispOn(J, team)); // l'agent tient J : la modification passe
  let result = await dayOf(A);
  assert.equal(result.presence, 'released');
  assert.equal(result.comment, 'note'); // la modification ne l'efface pas

  await setDayComment(A._id, day, 'note modifiée'); // modifier la note ne défait pas la modification
  result = await dayOf(A);
  assert.equal(result.presence, 'released');
  assert.equal(result.comment, 'note modifiée');
});

test('elle survit à une affectation, à son annulation et au retour à la vacation initiale', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, A, J, team, dayOf } = await setup();

  await setDayComment(A._id, day, 'note du jour');
  await registerEntry(A._id, day, dispOn(J, team));
  await registerEntry(A._id, day, office()); // l'affectation remplace la modification
  assert.equal((await dayOf(A)).type, 'office');
  assert.equal((await dayOf(A)).comment, 'note du jour');

  await deleteAssignment(A._id, day); // annulation de l'affectation
  assert.equal((await dayOf(A)).comment, 'note du jour');

  await registerEntry(A._id, day, office());
  await restoreInitialShift(A._id, day); // retour à la vacation initiale
  const result = await dayOf(A);
  assert.equal(result.shiftData.shift.name, 'J');
  assert.equal(result.comment, 'note du jour');
});

test('le commentaire d’une affectation s’affiche sans note, la note l’emporte, et supprimer vide les deux sans toucher l’affectation', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, A, dayOf } = await setup();

  await registerEntry(A._id, day, office('saisi avec l’affectation'));
  assert.equal((await dayOf(A)).comment, 'saisi avec l’affectation');

  await setDayComment(A._id, day, 'note');
  assert.equal((await dayOf(A)).comment, 'note');

  await setDayComment(A._id, day, ''); // « supprimer » supprime bien ce qui était affiché
  const result = await dayOf(A);
  assert.equal(result.comment, '');
  assert.equal(result.type, 'office'); // l'affectation est toujours là
  assert.equal(await Assignment.countDocuments({ userId: A._id, date: day, active: true }), 1);
});

test('au-delà de la limite : refusé en 400, rien n’est enregistré ni modifié', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, A, dayOf } = await setup();

  await setDayComment(A._id, day, 'garde');
  await assert.rejects(
    () => setDayComment(A._id, day, 'x'.repeat(CALENDAR_COMMENT_MAX_LENGTH + 1)),
    (error) => (error.status ?? error.statusCode) === 400,
  );
  assert.equal((await dayOf(A)).comment, 'garde');

  await setDayComment(A._id, day, 'x'.repeat(CALENDAR_COMMENT_MAX_LENGTH)); // la limite elle-même passe
  assert.equal((await dayOf(A)).comment.length, CALENDAR_COMMENT_MAX_LENGTH);
});

test('PUT /calendar-entry/comment : jeton requis, jour et longueur validés, et la vacation recalculée du jour est renvoyée', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, A } = await setup();
  const token = generateAccessToken({ userId: A._id, isAdmin: false, adminType: undefined, centerId: A.centerId });
  const put = (body, auth = true) =>
    fetch(`${base}/calendar-entry/comment`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify(body),
    });

  assert.equal((await put({ date: day, comment: 'x' }, false)).status, 401);
  assert.equal((await put({ date: 'pas un jour', comment: 'x' })).status, 400);
  assert.equal((await put({ date: `${day}T10:00:00Z`, comment: 'x' })).status, 400); // une clé de jour, pas un instant
  assert.equal((await put({ date: day, comment: 'x'.repeat(CALENDAR_COMMENT_MAX_LENGTH + 1) })).status, 400);

  const saved = await put({ date: day, comment: 'via l’API' });
  assert.equal(saved.status, 200);
  const body = await saved.json();
  assert.equal(body.userShift[0].comment, 'via l’API');
  assert.equal(body.type, 'comment');
  assert.equal(await DayComment.countDocuments({ userId: A._id, date: day }), 1);

  const removed = await put({ date: day, comment: '' });
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).userShift[0].comment, '');
  assert.equal(await DayComment.countDocuments({ userId: A._id, date: day }), 0);
});

test('computeUserShifts : une clé de jour ou un tableau de clés, jamais un instant', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { day, otherDay, A } = await setup();
  const isBadRequest = (error) => (error.status ?? error.statusCode) === 400;

  assert.equal((await computeUserShifts(day, A._id)).length, 1); // une clé
  assert.deepEqual((await computeUserShifts([otherDay, day], A._id)).map((result) => result.date), [otherDay, day]); // un tableau, dans l'ordre

  await assert.rejects(() => computeUserShifts(new Date(`${day}T00:00:00Z`), A._id), isBadRequest);
  await assert.rejects(() => computeUserShifts([`${day}T10:00:00Z`], A._id), isBadRequest);
  await assert.rejects(() => computeUserShifts(['2026-02-30'], A._id), isBadRequest);
});
