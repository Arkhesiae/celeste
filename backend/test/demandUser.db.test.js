/**
 * `GET /demand/user/:userId` : les demandes d'un utilisateur, pour lui-même ou l'administrateur de son centre.
 *
 *   node --test backend/test/demandUser.db.test.js
 *
 * Nécessite un MongoDB local (TEST_SUBUSER_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_subuser), supprimé à la
 * fin. Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import User from '../models/User.js';
import Demand from '../models/Demand.js';
import routes from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { generateAccessToken } from '../services/auth/auth.refreshToken.js';

const URI = process.env.TEST_SUBUSER_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_subuser';
let available = false;
let server;
let base;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_SUBUSER_MONGO_URI doit viser une base de test : ${URI}`);
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

const call = async (path, user) => {
  const token = generateAccessToken({ userId: user._id, isAdmin: user.isAdmin, adminType: user.adminType, centerId: user.centerId });
  const response = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
  return { status: response.status, data: await response.json().catch(() => ({})) };
};

test("les demandes d'un utilisateur : lui-même et l'administrateur de son centre, personne d'autre", async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const [a, b] = await Promise.all([
    Center.create({ name: 'A', OACI: 'AAAA', type: 'app', timeZone: 'Europe/Paris' }),
    Center.create({ name: 'B', OACI: 'BBBB', type: 'app', timeZone: 'Europe/Paris' }),
  ]);
  const password = await bcrypt.hash('x', 4);
  const mk = (extra) => User.create({ name: 'U', lastName: 'V', email: `${new mongoose.Types.ObjectId()}@x.fr`, password, registrationStatus: 'verified', ...extra });
  const owner = await mk({ centerId: a._id });
  const colleague = await mk({ centerId: a._id });
  const adminA = await mk({ centerId: a._id, isAdmin: true, adminType: 'local' });
  const adminB = await mk({ centerId: b._id, isAdmin: true, adminType: 'local' });
  await Demand.collection.insertOne({ posterId: owner._id, centerId: a._id, status: 'open', type: 'substitution', deleted: false });

  const own = await call(`/demand/user/${owner._id}`, owner);
  assert.equal(own.status, 200);
  assert.equal(own.data.length, 1);
  assert.equal((await call(`/demand/user/${owner._id}`, adminA)).status, 200);            // administrateur de son centre
  assert.equal((await call(`/demand/user/${owner._id}`, colleague)).status, 403);          // un collègue
  assert.equal((await call(`/demand/user/${owner._id}`, adminB)).status, 403);             // un administrateur d'un autre centre
  assert.equal((await call('/demand/user/pas-un-id', owner)).status, 400);
});
