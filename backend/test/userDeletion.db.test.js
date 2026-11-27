/**
 * Suppression définitive d'un compte (administrateur principal) : aperçu sans écriture, confirmation, plus aucune trace du compte
 * dans aucune collection, le passé des collègues inchangé, leurs plannings à venir rétablis, rien d'écrit en cas d'échec.
 *
 *   node --test backend/test/userDeletion.db.test.js
 *
 * Nécessite un MongoDB local en replica set (TEST_USER_DELETION_MONGO_URI, par défaut
 * mongodb://127.0.0.1:27017/celeste_test_user_deletion), supprimé à la fin. Sans MongoDB joignable, les tests sont ignorés.
 * Les données passées et à venir viennent des vrais flux (publication, acceptation, permutation) ; les mails sont simulés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import http from 'node:http';
import express from 'express';
import mongoose from 'mongoose';
import { Temporal } from '@js-temporal/polyfill';
import Center from '../models/Center.js';
import Team from '../models/Team.js';
import Shift from '../models/Shift.js';
import Rotation from '../models/Rotation.js';
import User, { LegacyUser } from '../models/User.js';
import '../models/Variation.js';
import Demand from '../models/Demand.js';
import { CalendarEntry, Assignment } from '../models/CalendarEntry.js';
import DayComment from '../models/DayComment.js';
import PointTransfer from '../models/PointTransfer.js';
import Ticket from '../models/Ticket.js';
import Message from '../models/Message.js';
import Otp from '../models/Otp.js';
import Banner from '../models/Banner.js';
import Announcement from '../models/Announcement.js';
import routes from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { generateAccessToken } from '../services/auth/auth.refreshToken.js';
import { computeUserShifts } from '../services/planning/planning.userShifts.js';
import { createDemand } from '../services/demand/demand.creation.js';
import { acceptDemand } from '../services/demand/demand.accept.js';
import { processAndCompleteDemands } from '../services/demand/demand.expiry.js';
import { acknowledgeBanner } from '../services/banner/banner.service.js';
import { deleteUserCompletely, previewUserDeletion } from '../services/user/user.delete.js';
import { AVATARS_DIRECTORY } from '../config/paths.js';

process.env.JWT_SECRET ??= 'test-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
delete process.env.MAIL_SERVICE;
process.env.NODE_ENV = 'test';

const URI = process.env.TEST_USER_DELETION_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_user_deletion';
let available = false;
let server;
let base;
const mails = [];
const realLog = console.log;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_USER_DELETION_MONGO_URI doit viser une base de test : ${URI}`);
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 2500 });
    await mongoose.connection.dropDatabase();
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 600));
const today = Temporal.Now.plainDateISO('Europe/Paris');
const day = (n) => today.add({ days: n }).toString();
const utc = (key) => new Date(`${key}T00:00:00Z`);

/** Tout le contenu de la base, trié : pour comparer avant / après */
const dumpDatabase = async () => {
  const collections = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name).sort();
  const dump = {};
  for (const name of collections) {
    const documents = await mongoose.connection.collection(name).find().sort({ _id: 1 }).toArray();
    dump[name] = documents.map((document) => JSON.stringify(document));
  }
  return dump;
};

/** Les documents, toutes collections confondues, qui contiennent l'une de ces chaînes */
const tracesOf = async (...needles) => {
  const dump = await dumpDatabase();
  return Object.entries(dump).flatMap(([name, documents]) => documents
    .filter((document) => needles.some((needle) => document.toLowerCase().includes(needle.toLowerCase())))
    .map((document) => `${name}: ${document.slice(0, 300)}`));
};

const planningOf = async (user, keys) => (await computeUserShifts(keys, user._id)).map((r) => [
  r.date, r.type, r.presence, r.shiftData?.shift?.name ?? null, r.substitution?.kind ?? null, r.substitution?.gave?.shift?.name ?? null, r.isWorked,
].join(' '));

/**
 * Cinq agents sur cinq équipes (rotation J K L M repos, en place depuis 30 jours). `gone` sera supprimé. Il a : une demande passée
 * acceptée par `colleague`, une demande passée de `colleague` qu'il avait acceptée, une demande à venir acceptée par `colleague`,
 * une demande à venir de `colleague` qu'il a acceptée, une demande ouverte, et de tout ce qui peut le concerner ailleurs.
 */
async function setup () {
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.connection.models).map((model) => model.createCollection().catch(() => {})));
  const center = await Center.create({ name: 'DEL', OACI: 'TEST', type: 'app', timeZone: 'Europe/Paris', cycleAnchorDay: day(-30), cycleAnchorDate: utc(day(-30)) });
  const work = (name, order) => Shift.create({ name, order, type: 'work', default: { startTime: '07:00', endTime: '15:00', points: 10 } });
  const shifts = [await work('J', 0), await work('K', 1), await work('L', 2), await work('M', 3),
    await Shift.create({ name: 'R', order: 4, type: 'rest', default: { startTime: null, endTime: null, points: 0 } })];
  await Rotation.create({ name: 'rot', centerId: center._id, days: shifts.map((s) => s._id), activationDays: [day(-30)], activationDates: [utc(day(-30))] });
  const teams = [];
  for (let i = 0; i < 5; i++) teams.push(await Team.create({ name: `T${i}`, center: center._id, cycleOffset: i, cycleStartDate: utc(day(-30 + i)) }));

  const make = (name, team, extra = {}) => User.create({
    name, lastName: `Nom${name}`, email: `${name.toLowerCase()}@del.fr`, password: 'x'.repeat(20), registrationStatus: 'verified', centerId: center._id,
    teams: team ? [{ teamId: team._id, fromDay: '2020-01-01', fromDate: utc('2020-01-01') }] : [], points: 100, ...extra,
  });
  const master = await make('Master', null, { isAdmin: true, adminType: 'master' });
  const admin = await make('Admin', teams[4], { isAdmin: true, adminType: 'local' });
  const gone = await make('Gone', teams[0], { avatar: '/avatars/gone-test-avatar.png' });
  const colleague = await make('Colleague', teams[1]);
  const bystander = await make('Bystander', teams[2]);

  // les jours où `gone` (équipe 0) et `colleague` (équipe 1) travaillent, l'autre ne travaillant pas la même vacation
  const worksOn = async (user, n) => (await computeUserShifts([day(n)], user._id))[0].isWorked;
  const used = new Set();  // un jour par demande, sauf pour les chaînes voulues
  const pick = async (user, other, candidates) => {
    for (const n of candidates) {
      if (!used.has(n) && await worksOn(user, n) && !(await worksOn(other, n))) { used.add(n); return n; }
    }
    throw new Error('aucun jour disponible');
  };
  const range = (from, to) => Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + (to > from ? i : -i));
  const post = (user, n, extra = {}) => createDemand({ posterId: user._id, posterShift: { date: day(n) }, points: 0, acceptedSwitches: [], ...extra });
  const replaced = async (poster, accepter, candidates, extra) => {
    const n = await pick(poster, accepter, candidates);
    const demand = await post(poster, n, extra);
    await acceptDemand(demand._id, accepter._id);
    return { n, id: demand._id };
  };

  const past = {
    goneReplaced: await replaced(gone, colleague, range(-3, -20)),
    colleagueReplaced: await replaced(colleague, gone, range(-3, -20), { points: 5 }),
  };
  // le passé est clos comme le fait la tâche d'expiration, sauf une demande restée « acceptée »
  await Demand.updateOne({ _id: past.goneReplaced.id }, { status: 'completed', deleted: true });
  const future = {
    goneReplaced: await replaced(gone, colleague, range(3, 20)),
    colleagueReplaced: await replaced(colleague, gone, range(3, 20)),
  };
  let openDay;
  for (const n of range(21, 40)) if (!used.has(n) && await worksOn(gone, n)) { openDay = n; break; }
  const open = await post(gone, openDay, { points: 3 });
  // les autres se sont intéressés à ses demandes et lui aux leurs
  let otherDay;
  for (const n of range(21, 40)) if (await worksOn(bystander, n)) { otherDay = n; break; }
  const others = await post(bystander, otherDay);
  await Demand.updateOne({ _id: others._id }, { $addToSet: { seenBy: gone._id, consultedBy: gone._id, interested: gone._id } });

  await Assignment.create({ userId: gone._id, centerId: center._id, date: day(45), subType: 'training', startTime: '09:00', endTime: '17:00' });
  await DayComment.create({ userId: gone._id, date: day(2), comment: 'note' });
  await DayComment.create({ userId: bystander._id, date: day(2), comment: 'note of someone else' });
  await PointTransfer.create({ sender: gone._id, receiver: colleague._id, amount: 4, type: 'transfer', status: 'completed', effectiveDate: utc(day(-5)) });
  await PointTransfer.create({ sender: colleague._id, receiver: gone._id, amount: 7, type: 'transfer', status: 'pending', effectiveDate: utc(day(9)) });
  await PointTransfer.create({ sender: colleague._id, receiver: bystander._id, amount: 1, type: 'transfer', status: 'completed', effectiveDate: utc(day(-5)) });
  const ticket = { content: 'c', type: 'assistance', adminType: 'master' };
  await Ticket.create({ ...ticket, title: 'by id', senderEmail: 'other-address@del.fr', senderId: gone._id });
  await Ticket.create({ ...ticket, title: 'by address, other case', senderEmail: 'GONE@del.fr' });
  await Ticket.create({ ...ticket, title: 'not theirs', senderEmail: 'xgone@del.fr', senderId: bystander._id });
  const message = { title: 't', content: 'c', type: 'other', senderEmail: 'x@del.fr' };
  await Message.create({ ...message, receiverId: gone._id });
  await Message.create({ ...message, senderId: gone._id, receiverId: master._id });
  await Message.create({ ...message, senderId: bystander._id, receiverId: master._id });
  await Otp.create({ email: 'gone@del.fr', code: '1', expiresAt: utc(day(2)) });
  await Otp.create({ email: 'bystander@del.fr', code: '2', expiresAt: utc(day(2)) });
  const legacy = (id, email) => ({ _id: new mongoose.Types.ObjectId(), ID: id, nom: 'n', prenom: 'p', login: `l${id}`, pass: 'p', email, centre: 'x' });
  await LegacyUser.create(legacy(1, 'gone@del.fr'));
  await LegacyUser.create(legacy(2, 'bystander@del.fr'));
  const written = await Banner.create({ title: 'written by gone', message: 'm', createdBy: gone._id, centerId: center._id, isPermanent: false });
  const read = await Banner.create({ title: 'read by gone', message: 'm', createdBy: master._id, centerId: center._id, isPermanent: false, acknowledgedBy: [{ userId: gone._id }, { userId: bystander._id }] });
  await Announcement.collection.insertOne({ title: 't', message: 'm', results: { total: 2, sent: 0, failed: 2, errors: [{ email: 'gone@del.fr', error: 'e' }, { email: 'bystander@del.fr', error: 'e' }] } });
  fs.mkdirSync(AVATARS_DIRECTORY, { recursive: true });
  const avatarFile = path.join(AVATARS_DIRECTORY, 'gone-test-avatar.png');
  fs.writeFileSync(avatarFile, 'x');
  await settle(); // les mails de la mise en place
  mails.length = 0;
  return { center, teams, shifts, master, admin, gone, colleague, bystander, past, future, open, others, written, read, avatarFile };
}

const call = async (user, method, url) => {
  const token = generateAccessToken({ userId: user._id, isAdmin: !!user.isAdmin, adminType: user.adminType, centerId: user.centerId });
  const response = await fetch(base + url, { method, headers: { Authorization: `Bearer ${token}` } });
  return { status: response.status, body: await response.json().catch(() => null) };
};

test('only the master admin may delete, never themselves, and without confirmation nothing is written', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const s = await setup();
  const before_ = await dumpDatabase();

  for (const caller of [s.colleague, s.admin, s.gone]) {
    for (const suffix of ['', '?confirmed=true']) {
      assert.equal((await call(caller, 'DELETE', `/user/${s.gone._id}${suffix}`)).status, 403, `${caller.name}${suffix}`);
    }
  }
  for (const suffix of ['', '?confirmed=true']) {
    const self = await call(s.master, 'DELETE', `/user/${s.master._id}${suffix}`);
    assert.deepEqual([self.status, self.body.code], [400, 'CANNOT_DELETE_SELF']);
  }
  assert.equal((await call(s.master, 'DELETE', `/user/${new mongoose.Types.ObjectId()}`)).status, 404);
  assert.equal((await call(s.master, 'DELETE', '/user/nope?confirmed=true')).status, 400);

  for (const suffix of ['', '?confirmed=false', '?confirmed=1']) {
    const preview = await call(s.master, 'DELETE', `/user/${s.gone._id}${suffix}`);
    assert.equal(preview.status, 409, suffix);
    assert.equal(preview.body.needsApproval, true);
  }
  const { impact } = (await call(s.master, 'DELETE', `/user/${s.gone._id}`)).body;
  assert.equal(impact.user.email, 'gone@del.fr');
  assert.equal(impact.from, today.toString());
  assert.deepEqual(impact.demands.map((d) => d.action).sort(), ['cancel', 'cancel', 'withdraw']);
  assert.deepEqual(Object.keys(impact).sort(), ['demands', 'from', 'isLastCenterAdmin', 'pendingTransfers', 'user']);
  assert.equal(impact.isLastCenterAdmin, false);
  assert.equal((await previewUserDeletion(String(s.admin._id), { actorId: String(s.master._id) })).isLastCenterAdmin, true);

  await settle();
  assert.deepEqual(await dumpDatabase(), before_, 'not a byte changed');
  assert.deepEqual(mails, []);
  assert.ok(fs.existsSync(s.avatarFile));
});

test('a confirmed deletion leaves no trace of the account, keeps the past of colleagues and restores their future', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const s = await setup();
  const PAST = Array.from({ length: 25 }, (_, i) => day(i - 25));
  const pastBefore = { colleague: await planningOf(s.colleague, PAST), bystander: await planningOf(s.bystander, PAST) };
  const wide = Array.from({ length: 50 }, (_, i) => day(i));
  const bystanderBefore = await planningOf(s.bystander, wide);
  const points = async () => Object.fromEntries((await User.find({ _id: { $ne: s.gone._id } })).map((u) => [u.name, u.points]));
  const pointsBefore = await points();
  assert.ok(pastBefore.colleague.some((row) => row.includes('replacing')) && pastBefore.colleague.some((row) => row.includes('replaced')), 'the colleague has a past with the account');
  assert.ok((await tracesOf(String(s.gone._id), 'gone@del.fr')).length > 10);

  const response = await call(s.master, 'DELETE', `/user/${s.gone._id}?confirmed=true`);
  assert.equal(response.status, 200, JSON.stringify(response.body));
  await settle();

  // no record anywhere still names the account (the unrelated look-alike address aside)
  const traces = (await tracesOf(String(s.gone._id), '"gone@del.fr"', 'GONE@del.fr"')).filter((trace) => !trace.includes('xgone@del.fr'));
  assert.deepEqual(traces, []);
  assert.equal(await User.countDocuments({ _id: s.gone._id }), 0);
  assert.equal(await CalendarEntry.countDocuments({ userId: s.gone._id }), 0);
  assert.equal(fs.existsSync(s.avatarFile), false);

  // the past of the colleagues is exactly what it was
  assert.deepEqual(await planningOf(s.colleague, PAST), pastBefore.colleague);
  assert.deepEqual(await planningOf(s.bystander, PAST), pastBefore.bystander);
  assert.deepEqual(await planningOf(s.bystander, wide), bystanderBefore);
  assert.deepEqual(await points(), pointsBefore, 'nobody else gains or loses points');

  // the future of the colleague is restored: no replacement, in either direction
  const futureDays = [day(s.future.goneReplaced.n), day(s.future.colleagueReplaced.n)];
  for (const row of await planningOf(s.colleague, futureDays)) assert.ok(!row.includes('replac'), row);
  const reopened = await Demand.findById(s.future.colleagueReplaced.id);
  assert.deepEqual([reopened.status, reopened.accepterId ?? null], ['open', null]);

  // past demands: theirs are gone, the colleague's stays without accepter, and the expiry job closes it like any past one
  assert.equal(await Demand.countDocuments({ _id: { $in: [s.past.goneReplaced.id, s.future.goneReplaced.id, s.open._id] } }), 0);
  const keptState = async () => {
    const kept = await Demand.findById(s.past.colleagueReplaced.id);
    return [String(kept.posterId), kept.accepterId ?? null, kept.status, kept.deleted];
  };
  assert.deepEqual(await keptState(), [String(s.colleague._id), null, 'accepted', false]);
  await processAndCompleteDemands();
  assert.deepEqual(await keptState(), [String(s.colleague._id), null, 'completed', true]);
  assert.deepEqual(await planningOf(s.colleague, PAST), pastBefore.colleague, 'closing it changes no planning');
  const others = await Demand.findById(s.others._id);
  assert.deepEqual([others.status, others.seenBy.length, others.interested.length], ['open', 0, 0]);

  // what belongs to others is still there
  assert.deepEqual((await Ticket.find()).map((x) => x.title), ['not theirs']);
  assert.equal(await Message.countDocuments(), 1);
  assert.deepEqual((await Otp.find()).map((x) => x.email), ['bystander@del.fr']);
  assert.deepEqual((await LegacyUser.find()).map((x) => x.email), ['bystander@del.fr']);
  assert.equal(await DayComment.countDocuments(), 1);
  assert.equal(await PointTransfer.countDocuments({ sender: s.colleague._id, receiver: s.bystander._id }), 1);
  const announcement = await Announcement.collection.findOne();
  assert.deepEqual(announcement.results.errors.map((e) => e.email), ['bystander@del.fr']);

  // banners stay, and one without an author can still be saved (reading it saves it again)
  const written = await Banner.findById(s.written._id);
  assert.equal(written.createdBy, null);
  await acknowledgeBanner(String(s.written._id), String(s.bystander._id));
  assert.equal((await Banner.findById(s.read._id)).acknowledgedBy.length, 1);

  // mails: the colleague is told (cancelled, withdrawn, pending transfer), the deleted account receives nothing
  assert.ok(mails.some((m) => m.includes('colleague@del.fr') && /annulée/i.test(m)), mails.join('\n'));
  assert.ok(mails.some((m) => m.includes('colleague@del.fr') && /désist/i.test(m)), mails.join('\n'));
  assert.ok(mails.some((m) => m.includes('colleague@del.fr') && /Transfert de points annulé/i.test(m)), mails.join('\n'));
  assert.ok(!mails.some((m) => m.includes('à gone@del.fr')), mails.join('\n'));

  assert.equal((await call(s.master, 'DELETE', `/user/${s.gone._id}?confirmed=true`)).status, 404, 'already gone');
});

test('a failure anywhere leaves the database, the mails and the avatar untouched', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const s = await setup();
  const before_ = await dumpDatabase();
  const failures = [[Demand, 'bulkWrite'], [Banner, 'bulkWrite'], [PointTransfer, 'deleteMany'], [LegacyUser, 'deleteMany'], [User, 'deleteOne']];
  for (const [model, method] of failures) {
    const real = model[method];
    model[method] = () => { throw new Error(`failure on ${model.modelName}.${method}`); };
    try {
      await assert.rejects(deleteUserCompletely(String(s.gone._id), { actorId: String(s.master._id) }), /failure on/);
    } finally {
      model[method] = real;
    }
    await settle();
    assert.deepEqual(await dumpDatabase(), before_, `rolled back after ${model.modelName}.${method}`);
    assert.deepEqual(mails, []);
    assert.ok(fs.existsSync(s.avatarFile));
  }
  await deleteUserCompletely(String(s.gone._id), { actorId: String(s.master._id) });
  assert.equal(await User.countDocuments({ _id: s.gone._id }), 0);
  fs.rmSync(s.avatarFile, { force: true });
});

test('an account with nothing, without center or team, whose avatar file is already missing', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const s = await setup();
  const lonely = await User.create({ name: 'Lonely', lastName: 'L', email: 'lonely@del.fr', password: 'x'.repeat(20), avatar: '/avatars/lonely-missing.png' });
  const lonelyDay = await computeUserShifts([day(1)], lonely._id);
  assert.equal(lonelyDay[0].baseShift, null);
  assert.deepEqual(await deleteUserCompletely(String(lonely._id), { actorId: String(s.master._id) }), { cancelled: 0, withdrawn: 0 });
  assert.ok(fs.existsSync(s.avatarFile), "another account's file stays");
  assert.equal(await User.countDocuments({ _id: lonely._id }), 0);
  fs.rmSync(s.avatarFile, { force: true });
});

test("a demand of someone else that depended on one of the account's is cancelled, and nothing points at the deleted one", async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const s = await setup();
  // une chaîne à venir : colleague a repris une vacation de gone, puis la republie, et bystander la reprend
  const chainDay = day(s.future.goneReplaced.n);
  const child = await createDemand({ posterId: s.colleague._id, posterShift: { date: chainDay }, points: 0, acceptedSwitches: [] });
  assert.deepEqual((await Demand.findById(child._id)).dependsOn.map(String), [String(s.future.goneReplaced.id)]);
  await acceptDemand(child._id, s.bystander._id);
  await settle();
  mails.length = 0;

  const impact = await previewUserDeletion(String(s.gone._id), { actorId: String(s.master._id) });
  assert.ok(impact.demands.some((d) => d.id === String(child._id) && d.cascade && d.action === 'cancel'), 'announced before deleting');

  await deleteUserCompletely(String(s.gone._id), { actorId: String(s.master._id) });
  await settle();
  const after_ = await Demand.findById(child._id);
  assert.match(after_.status, /cancelled/);
  assert.deepEqual(after_.dependsOn.map(String), []);
  for (const user of [s.colleague, s.bystander]) {
    const [row] = await planningOf(user, [chainDay]);
    assert.ok(!row.includes('replac'), row);
  }
  assert.ok(mails.some((m) => m.includes('bystander@del.fr') && /annulée/i.test(m)), mails.join(' | '));
  assert.deepEqual((await tracesOf(String(s.gone._id))), []);
  fs.rmSync(s.avatarFile, { force: true });
});

