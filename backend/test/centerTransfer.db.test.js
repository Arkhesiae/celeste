/**
 * Mutation de centre : demande de l'utilisateur, annulation, lecture par les administrateurs des deux centres, acceptation par celui du
 * centre d'arrivée uniquement, et ce qu'elle efface (période à venir, équipes, points).
 *
 *   node --test backend/test/centerTransfer.db.test.js
 *
 * Nécessite un MongoDB local en replica set (TEST_TRANSFER_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_transfer),
 * supprimé à la fin. Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import User from '../models/User.js';
import Substitution from '../models/Substitution.js';
import { Assignment } from '../models/CalendarEntry.js';
import routes from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { generateAccessToken } from '../services/auth/auth.refreshToken.js';

const URI = process.env.TEST_TRANSFER_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_transfer';
let available = false;
let server;
let base;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_TRANSFER_MONGO_URI doit viser une base de test : ${URI}`);
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

const makeUser = async (centerId, extra = {}) =>
  User.create({
    name: 'U', lastName: 'V', email: `${new mongoose.Types.ObjectId()}@x.fr`, password: await bcrypt.hash('x', 4),
    registrationStatus: 'verified', centerId, ...extra,
  });

const call = async (user, method, path, body) => {
  const token = generateAccessToken({ userId: user._id, isAdmin: !!user.isAdmin, adminType: user.adminType, centerId: user.centerId });
  const response = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};

test('mutation de centre : demande, annulation, visibilité, acceptation et remise à zéro', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const centerA = await Center.create({ name: 'A', OACI: 'AAAA', type: 'app', timeZone: 'Europe/Paris' });
  const centerB = await Center.create({ name: 'B', OACI: 'BBBB', type: 'app', timeZone: 'Europe/Paris' });
  const centerC = await Center.create({ name: 'C', OACI: 'CCCC', type: 'app', timeZone: 'Europe/Paris' });
  const adminA = await makeUser(centerA._id, { isAdmin: true, adminType: 'local' });
  const adminB = await makeUser(centerB._id, { isAdmin: true, adminType: 'local' });
  const adminC = await makeUser(centerC._id, { isAdmin: true, adminType: 'local' });
  const user = await makeUser(centerA._id, { points: -12, teams: [{ teamId: new mongoose.Types.ObjectId(), fromDay: '2020-01-01', toDay: null }] });
  const colleague = await makeUser(centerA._id);

  // à venir : une entrée de calendrier liée à une vacation et une demande de remplacement ouverte
  const day = '2099-03-10';
  const entry = await Assignment.create({
    userId: user._id, centerId: centerA._id, date: day, subType: 'training',
    shiftData: { shift: new mongoose.Types.ObjectId(), team: new mongoose.Types.ObjectId() },
  });
  const demand = await Substitution.create({
    posterId: user._id, centerId: centerA._id, type: 'substitution', points: 5,
    posterShift: { shift: new mongoose.Types.ObjectId(), teamId: new mongoose.Types.ObjectId(), day, date: new Date(`${day}T00:00:00.000Z`) },
  });

  // aperçu avant la demande : ce qui sera effacé, et l'alerte de solde négatif
  const preview = (await call(user, 'GET', '/center-transfer/preview')).body;
  assert.equal(preview.substitutions, 1);
  assert.equal(preview.entries, 1);
  assert.equal(preview.points, -12);
  assert.equal(preview.negativePoints, true);

  // validations : motif requis, centre d'arrivée valide et différent
  assert.equal((await call(user, 'POST', '/center-transfer', { toCenterId: centerB._id })).status, 400);
  assert.equal((await call(user, 'POST', '/center-transfer', { toCenterId: 'nope', reason: 'x' })).status, 400);
  assert.equal((await call(user, 'POST', '/center-transfer', { toCenterId: centerA._id, reason: 'x' })).status, 400);
  assert.equal((await call(user, 'POST', '/center-transfer', { toCenterId: new mongoose.Types.ObjectId(), reason: 'x' })).status, 404);

  // dépôt ; une seconde demande est refusée
  assert.equal((await call(user, 'POST', '/center-transfer', { toCenterId: centerB._id, reason: 'Rapprochement' })).status, 201);
  const second = await call(user, 'POST', '/center-transfer', { toCenterId: centerB._id, reason: 'Encore' });
  assert.equal(second.status, 400);
  assert.equal(second.body.code, 'CENTER_TRANSFER_ALREADY_PENDING');
  const mine = (await call(user, 'GET', '/center-transfer/mine')).body;
  assert.equal(mine.toCenter.name, 'B');
  assert.equal(mine.reason, 'Rapprochement');

  // en attente : l'utilisateur est bloqué sur les points (voir middleware/userStatus.js) mais peut lire et annuler
  const blocked = await call(user, 'POST', `/user/${user._id}/points/transfer`, { toUserId: colleague._id, amount: 1 });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'CENTER_TRANSFER_PENDING');

  // visibilité : le centre de départ et le centre d'arrivée la voient, un autre centre non ; seul l'arrivée peut accepter
  const fromA = (await call(adminA, 'GET', '/center-transfer')).body;
  assert.equal(fromA.length, 1);
  assert.equal(fromA[0].direction, 'outgoing');
  assert.equal(fromA[0].canAccept, false);
  const fromB = (await call(adminB, 'GET', '/center-transfer')).body;
  assert.equal(fromB[0].direction, 'incoming');
  assert.equal(fromB[0].canAccept, true);
  assert.equal((await call(adminC, 'GET', '/center-transfer')).body.length, 0);
  assert.equal((await call(user, 'GET', '/center-transfer')).status, 403);

  assert.equal((await call(adminA, 'POST', `/center-transfer/${user._id}/accept`)).status, 403);
  assert.equal((await call(adminC, 'POST', `/center-transfer/${user._id}/accept`)).status, 403);
  assert.equal((await call(colleague, 'POST', `/center-transfer/${user._id}/accept`)).status, 403);

  // annulation par l'utilisateur : plus rien en attente, rien n'a été effacé
  assert.equal((await call(user, 'DELETE', '/center-transfer')).status, 200);
  assert.equal((await call(user, 'GET', '/center-transfer/mine')).body, null);
  assert.equal((await call(user, 'DELETE', '/center-transfer')).status, 404);
  assert.equal((await Assignment.findById(entry._id)).active, true);
  assert.equal((await call(adminB, 'GET', '/center-transfer')).body.length, 0);

  // nouvelle demande, acceptée par l'administrateur du centre d'arrivée
  assert.equal((await call(user, 'POST', '/center-transfer', { toCenterId: centerB._id, reason: 'Rapprochement' })).status, 201);
  const accepted = await call(adminB, 'POST', `/center-transfer/${user._id}/accept`);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.cancelled, 1);

  const moved = await User.findById(user._id);
  assert.equal(String(moved.centerId), String(centerB._id));
  assert.equal(moved.teams.length, 0);
  assert.equal(moved.points, 0);
  assert.equal(moved.pendingCenterTransfer, null);
  assert.equal((await Assignment.findById(entry._id)).active, false);
  assert.equal((await Substitution.findById(demand._id)).status.includes('cancelled'), true);

  // l'acceptation d'une demande qui n'existe plus échoue ; un administrateur local qui change de centre ne l'est plus
  assert.equal((await call(adminB, 'POST', `/center-transfer/${user._id}/accept`)).status, 404);
  assert.equal((await call(adminA, 'POST', '/center-transfer', { toCenterId: centerC._id, reason: 'Mutation' })).status, 201);
  assert.equal((await call(adminC, 'POST', `/center-transfer/${adminA._id}/accept`)).status, 200);
  const formerAdmin = await User.findById(adminA._id);
  assert.equal(formerAdmin.isAdmin, false);
  assert.equal(formerAdmin.adminType, null);
});
