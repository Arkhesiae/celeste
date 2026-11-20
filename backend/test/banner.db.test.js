/**
 * Bannières du tableau de bord (ex « annonces publiques ») : création, lecture par l'utilisateur (portée globale / centre,
 * expiration, acquittement), gestion cloisonnée par centre.
 *
 *   node --test backend/test/banner.db.test.js
 *
 * Nécessite un MongoDB local (TEST_BANNER_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_banner), supprimé à la
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
import routes from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { generateAccessToken } from '../services/auth/auth.refreshToken.js';

const URI = process.env.TEST_BANNER_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_banner';
let available = false;
let server;
let base;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_BANNER_MONGO_URI doit viser une base de test : ${URI}`);
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

const tokenOf = (user) =>
  generateAccessToken({ userId: user._id, isAdmin: !!user.isAdmin, adminType: user.adminType, centerId: user.centerId });

const call = async (user, method, path, body) => {
  const response = await fetch(base + path, {
    method,
    headers: { Authorization: `Bearer ${tokenOf(user)}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};

test('bannières : portée, expiration, acquittement et gestion par centre', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const centerA = await Center.create({ name: 'A', OACI: 'AAAA', type: 'app', timeZone: 'Europe/Paris' });
  const centerB = await Center.create({ name: 'B', OACI: 'BBBB', type: 'app', timeZone: 'Europe/Paris' });
  const master = await makeUser(centerA._id, { isAdmin: true, adminType: 'master' });
  const localAdmin = await makeUser(centerA._id, { isAdmin: true, adminType: 'local' });
  const userA = await makeUser(centerA._id);
  const userB = await makeUser(centerB._id);

  // création : le master publie une bannière globale, une permanente, une pour le centre B, une expirée, une inactive
  const global = (await call(master, 'POST', '/banner', { title: 'Globale', message: 'm', isGlobal: true })).body.banner;
  const permanent = (await call(master, 'POST', '/banner', { title: 'Permanente', message: 'm', isGlobal: true, isPermanent: true })).body.banner;
  const forB = (await call(master, 'POST', '/banner', { title: 'Pour B', message: 'm', isGlobal: false, centerId: centerB._id })).body.banner;
  await call(master, 'POST', '/banner', {
    title: 'Expirée', message: 'm', isGlobal: true, expiresAt: new Date(Date.now() - 3600_000).toISOString(),
  });
  await call(master, 'POST', '/banner', { title: 'Inactive', message: 'm', isGlobal: true, isActive: false });
  assert.ok(global?._id && permanent?._id && forB?._id, 'les bannières sont créées');

  // un administrateur local ne peut créer que pour son centre, même s'il demande le contraire
  const local = (await call(localAdmin, 'POST', '/banner', {
    title: 'Locale', message: 'm', isGlobal: true, centerId: centerB._id,
  })).body.banner;
  assert.equal(local.isGlobal, false);
  assert.equal(String(local.centerId), String(centerA._id));

  // lecture par un utilisateur du centre A : globale + locale, permanente à part ; ni le centre B, ni l'expirée, ni l'inactive
  const active = (await call(userA, 'GET', '/banner/active')).body;
  assert.deepEqual(active.nonPermanentBanners.map((b) => b.title).sort(), ['Globale', 'Locale']);
  assert.deepEqual(active.permanentBanners.map((b) => b.title), ['Permanente']);

  // le centre B voit la sienne
  const activeB = (await call(userB, 'GET', '/banner/active')).body;
  assert.deepEqual(activeB.nonPermanentBanners.map((b) => b.title).sort(), ['Globale', 'Pour B']);

  // acquittement : la bannière disparaît pour cet utilisateur seulement ; la permanente reste
  assert.equal((await call(userA, 'POST', `/banner/${global._id}/acknowledge`)).status, 200);
  const after = (await call(userA, 'GET', '/banner/active')).body;
  assert.deepEqual(after.nonPermanentBanners.map((b) => b.title), ['Locale']);
  assert.deepEqual(after.permanentBanners.map((b) => b.title), ['Permanente']);
  assert.equal((await call(userB, 'GET', '/banner/active')).body.nonPermanentBanners.length, 2);

  // un utilisateur simple ne gère rien
  assert.equal((await call(userA, 'GET', '/banner')).status, 403);

  // gestion : l'administrateur local voit les globales et celles de son centre, pas celles du centre B
  const listed = (await call(localAdmin, 'GET', '/banner')).body.banners.map((b) => b.title);
  assert.ok(listed.includes('Globale') && listed.includes('Locale'));
  assert.ok(!listed.includes('Pour B'));
  assert.equal((await call(master, 'GET', '/banner')).body.banners.length, 6);

  // ... et ne modifie que son centre
  assert.equal((await call(localAdmin, 'PUT', `/banner/${global._id}`, { title: 'X' })).status, 403);
  assert.equal((await call(localAdmin, 'PUT', `/banner/${forB._id}`, { title: 'X' })).status, 403);
  assert.equal((await call(localAdmin, 'PUT', `/banner/${local._id}`, { title: 'Locale 2' })).body.banner.title, 'Locale 2');
  assert.equal((await call(localAdmin, 'DELETE', `/banner/${local._id}`)).status, 200);
  assert.equal((await call(master, 'DELETE', `/banner/${forB._id}`)).status, 200);

  // l'ancienne adresse n'existe plus
  assert.equal((await call(userA, 'GET', '/public-announcement/active')).status, 404);
});
