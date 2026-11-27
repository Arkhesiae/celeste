/**
 * Désactivation d'un compte : aperçu sans écriture, confirmation, qui a le droit, effets sur les demandes et les transferts de
 * points, connexion refusée, réactivation.
 *
 *   node --test backend/test/userDeactivation.db.test.js
 *
 * Nécessite un MongoDB local en replica set (TEST_USER_DEACTIVATION_MONGO_URI, par défaut
 * mongodb://127.0.0.1:27017/celeste_test_user_deactivation), supprimé à la fin. Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { Temporal } from '@js-temporal/polyfill';
import Center from '../models/Center.js';
import Team from '../models/Team.js';
import { getTeamAtDay } from '../services/team/team.atDay.js';
import User from '../models/User.js';
import Demand from '../models/Demand.js';
import PointTransfer from '../models/PointTransfer.js';
import { CalendarEntry } from '../models/CalendarEntry.js';
import routes from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { generateAccessToken } from '../services/auth/auth.refreshToken.js';

process.env.JWT_SECRET ??= 'test-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
delete process.env.MAIL_SERVICE;
process.env.NODE_ENV = 'test';

const URI = process.env.TEST_USER_DEACTIVATION_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_user_deactivation';
let available = false;
let server;
let base;
const mails = [];
const realLog = console.log;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_USER_DEACTIVATION_MONGO_URI doit viser une base de test : ${URI}`);
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 2500 });
    await mongoose.connection.dropDatabase();
    await Promise.all(Object.values(mongoose.connection.models).map((model) => model.createCollection().catch(() => {})));
    available = true;
  } catch {
    available = false;
    return;
  }
  console.log = (...args) => {
    const line = args.join(' ');
    if (line.includes('Mail simulé')) mails.push(line);
  };
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  app.use(errorHandler);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  console.log = realLog;
  if (server) await new Promise((resolve) => server.close(resolve));
  if (available) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const today = Temporal.Now.plainDateISO('Europe/Paris');
const day = (n) => today.add({ days: n }).toString();
const utc = (key) => new Date(`${key}T00:00:00Z`);

const call = async (actor, method, path, body) => {
  const headers = { 'Content-Type': 'application/json' };
  if (actor) {
    headers.Authorization = `Bearer ${generateAccessToken({ userId: actor._id, isAdmin: actor.isAdmin, adminType: actor.adminType, centerId: actor.centerId })}`;
  }
  const response = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json().catch(() => ({})) };
};

test('désactivation : droits, aperçu, effets, connexion refusée, réactivation', async (t) => {
  if (!available) return t.skip('MongoDB injoignable');

  const [center, elsewhere] = await Center.create([
    { name: 'DEACT', OACI: 'TEST', type: 'app', timeZone: 'Europe/Paris' },
    { name: 'OTHER', OACI: 'OTHE', type: 'app', timeZone: 'Europe/Paris' },
  ]);
  const password = await bcrypt.hash('secret123', 4);
  let n = 0;
  const mk = (extra = {}) => {
    n += 1;
    return User.create({ name: `U${n}`, lastName: 'Test', email: `u${n}@deact.fr`, password, centerId: center._id, registrationStatus: 'verified', points: 100, ...extra });
  };
  const master = await mk({ isAdmin: true, adminType: 'master' });
  const admin = await mk({ isAdmin: true, adminType: 'local' });
  const otherAdmin = await mk({ isAdmin: true, adminType: 'local' });
  const foreignAdmin = await mk({ isAdmin: true, adminType: 'local', centerId: elsewhere._id });
  const plain = await mk();
  const [permanent, reinforced, later] = await Team.create(['A', 'B', 'C'].map((name) => ({ name, center: center._id })));
  const occurrence = (team, from, to = null) => ({ teamId: team._id, fromDay: day(from), fromDate: utc(day(from)), toDay: to === null ? null : day(to), toDate: to === null ? null : utc(day(to)) });
  // Équipe permanente, renfort en cours et changement à venir
  const gone = await mk({ teams: [occurrence(permanent, -30), occurrence(reinforced, -2, 3), occurrence(later, 20)] });
  const colleague = await mk();

  const demand = (posterId, offset, extra = {}) => Demand.collection.insertOne({
    posterId, centerId: center._id, type: 'substitution', status: 'open', deleted: false, dependsOn: [], points: 10,
    posterShift: { day: day(offset), date: utc(day(offset)) }, ...extra,
  }).then((result) => result.insertedId);
  const upcomingOwn = await demand(gone._id, 5);
  const pastOwn = await demand(gone._id, -5);
  const acceptedByGone = await demand(colleague._id, 6, {
    status: 'accepted', accepterId: gone._id, accepterShift: { day: day(6), date: utc(day(6)) },
  });

  const manual = await PointTransfer.create({ sender: colleague._id, receiver: gone._id, amount: 5, type: 'transfer', status: 'pending', effectiveDate: utc(day(10)) });
  const earned = await PointTransfer.create({ sender: colleague._id, receiver: gone._id, amount: 7, type: 'transfer', status: 'pending', effectiveDate: utc(day(10)), request: pastOwn });

  // Entrées de calendrier : seules celles liées à une vacation, à venir, sont désactivées
  const entry = (offset, shift) => CalendarEntry.collection.insertOne({
    userId: gone._id, date: day(offset), active: true, type: 'assignment', subType: 'training', shiftData: { shift },
  }).then((result) => result.insertedId);
  const upcomingShiftEntry = await entry(8, new mongoose.Types.ObjectId());
  const pastShiftEntry = await entry(-8, new mongoose.Types.ObjectId());
  const freeEntry = await entry(9, null);
  const isActiveEntry = async (id) => (await CalendarEntry.collection.findOne({ _id: id })).active;

  // Le transfert lié à une demande à venir est montré avec elle ; une demande dépendante déjà terminée n'est pas annoncée
  const tied = await PointTransfer.create({ sender: colleague._id, receiver: gone._id, amount: 3, type: 'replacement', status: 'pending', effectiveDate: utc(day(6)), request: acceptedByGone });
  await demand(colleague._id, 7, { status: 'completed', dependsOn: [upcomingOwn] });

  const path = (user) => `/user/${user._id}/deactivate`;
  const confirmed = { confirmed: true };

  // Qui n'a pas le droit
  assert.equal((await call(null, 'POST', path(gone), confirmed)).status, 401);
  assert.equal((await call(plain, 'POST', path(gone), confirmed)).status, 403);
  assert.equal((await call(foreignAdmin, 'POST', path(gone), confirmed)).status, 403);
  assert.equal((await call(admin, 'POST', path(otherAdmin), confirmed)).status, 403);
  assert.equal((await call(admin, 'POST', path(master), confirmed)).status, 403);
  assert.equal((await call(admin, 'POST', path(admin), confirmed)).body.code, 'CANNOT_DEACTIVATE_SELF');
  assert.equal((await call(master, 'POST', path(master), confirmed)).body.code, 'CANNOT_DEACTIVATE_SELF');

  // Aperçu : rien n'est écrit, y compris si `confirmed` n'est pas le booléen true
  for (const body of [{}, { confirmed: 'true' }]) {
    const preview = await call(admin, 'POST', path(gone), body);
    assert.equal(preview.status, 409);
    assert.equal(preview.body.needsApproval, true);
    assert.deepEqual(preview.body.impact.demands.map((d) => `${d.id} ${d.action}`).sort(),
      [`${upcomingOwn} cancel`, `${acceptedByGone} withdraw`].sort());
    assert.deepEqual(preview.body.impact.pendingTransfers.map((t) => t.id), [String(manual._id)]);
    assert.deepEqual(preview.body.impact.demands.flatMap((d) => d.transfers.map((t) => `${d.id} ${t.id} ${t.amount}`)),
      [`${acceptedByGone} ${tied._id} 3`]);
    assert.deepEqual(preview.body.impact.entries.map((e) => e.id), [String(upcomingShiftEntry)]);
  }
  assert.equal((await User.findById(gone._id)).isActive, true);
  assert.equal((await Demand.findById(upcomingOwn).lean()).status, 'open');

  // Une session ouverte avant la désactivation
  const login = await call(null, 'POST', '/auth/login', { email: gone.email, password: 'secret123' });
  assert.equal(login.status, 200);

  mails.length = 0;
  const done = await call(admin, 'POST', path(gone), confirmed);
  assert.equal(done.status, 200, JSON.stringify(done.body));
  await new Promise((resolve) => setTimeout(resolve, 600));

  const after_ = await User.findById(gone._id);
  assert.equal(after_.isActive, false);
  assert.equal(after_.refreshTokens.length, 0);
  assert.equal(after_.points, 100);
  const teamOn = (offset) => String(getTeamAtDay(after_.teams, day(offset))?.teamId ?? null);
  assert.deepEqual([-10, -1, 0, 2, 25].map(teamOn), [String(permanent._id), String(reinforced._id), 'null', 'null', 'null']);
  const assign = () => call(master, 'POST', `/user/${gone._id}/assign-team`, { teamId: String(permanent._id), fromDate: day(1), confirmed: true });
  assert.equal((await assign()).body.code, 'TARGET_ACCOUNT_INACTIVE');
  assert.deepEqual(await Promise.all([upcomingShiftEntry, pastShiftEntry, freeEntry].map(isActiveEntry)), [false, true, true]);
  assert.notEqual((await Demand.findById(upcomingOwn).lean()).status, 'open', 'upcoming own demand is cancelled');
  assert.equal((await Demand.findById(pastOwn).lean()).status, 'open', 'the past is left alone');
  const reopened = await Demand.findById(acceptedByGone).lean();
  assert.equal(reopened.status, 'open');
  assert.equal(reopened.accepterId ?? null, null);
  assert.equal((await PointTransfer.findById(manual._id)).status, 'cancelled');
  assert.equal((await PointTransfer.findById(earned._id)).status, 'pending');
  assert.equal((await PointTransfer.findById(tied._id)).status, 'cancelled', 'cancelled with its demand, as previewed');
  assert.ok(mails.some((line) => line.includes(gone.email)), 'the deactivated person is told');

  // Plus de connexion ni de requête ; un mauvais mot de passe ne révèle rien
  const refused = await call(null, 'POST', '/auth/login', { email: gone.email, password: 'secret123' });
  assert.equal(refused.status, 403);
  assert.equal(refused.body.code, 'ACCOUNT_INACTIVE');
  assert.equal((await call(null, 'POST', '/auth/login', { email: gone.email, password: 'wrong-one' })).body.code, 'INVALID_PASSWORD');
  assert.equal((await call(gone, 'GET', `/user/${gone._id}`)).body.code, 'ACCOUNT_INACTIVE');

  assert.equal((await call(admin, 'POST', path(gone), confirmed)).body.code, 'ACCOUNT_ALREADY_INACTIVE');
  assert.equal((await call(colleague, 'POST', `/user/${colleague._id}/points/transfer`, { toUserId: String(gone._id), amount: 1 })).status, 400);

  // Un administrateur désactivé ne compte plus comme administrateur du centre
  assert.equal((await call(master, 'POST', path(otherAdmin), confirmed)).status, 200);
  assert.equal((await call(master, 'POST', `/user/${admin._id}/remove-admin`)).status, 400);
  assert.equal((await call(admin, 'POST', `/user/${otherAdmin._id}/reactivate`)).status, 403);

  // Réactivation : connexion possible, ce qui a été annulé le reste
  assert.equal((await call(foreignAdmin, 'POST', `/user/${gone._id}/reactivate`)).status, 403);
  assert.equal((await call(admin, 'POST', `/user/${gone._id}/reactivate`)).status, 200);
  assert.equal((await call(null, 'POST', '/auth/login', { email: gone.email, password: 'secret123' })).status, 200);
  assert.notEqual((await Demand.findById(upcomingOwn).lean()).status, 'open');
  assert.equal(getTeamAtDay((await User.findById(gone._id)).teams, day(1)), null, 'reactivation gives no team back');
  assert.equal((await assign()).status, 200);
  assert.equal(String(getTeamAtDay((await User.findById(gone._id)).teams, day(1)).teamId), String(permanent._id));
  assert.equal((await call(admin, 'POST', `/user/${gone._id}/reactivate`)).body.code, 'ACCOUNT_ALREADY_ACTIVE');
});
