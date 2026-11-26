/**
 * Mails branchés : mutation acceptée, accusé de réception d'un ticket, nouveau tour de service. Les envois sont simulés (console).
 *
 *   node --test backend/test/wiredMails.db.test.js
 *
 * Necessite un MongoDB local (TEST_MAILS_MONGO_URI, par defaut mongodb://127.0.0.1:27017/celeste_test_mails), supprime a la fin.
 * Sans MongoDB joignable, les tests sont ignores.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import Rotation from '../models/Rotation.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { notifyCenterTransferAccepted } from '../services/email/email.centerTransfer.js';
import { notifyRotationChange } from '../services/email/email.rotationChange.js';
import { notifyTicketReceived } from '../services/email/email.ticketReceived.js';
import { createNewTicket } from '../services/ticket/ticket.create.js';

delete process.env.MAIL_SERVICE;
process.env.NODE_ENV = 'test';

const URI = process.env.TEST_MAILS_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_mails';
let available = false;
const logs = [];
const realLog = console.log;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_MAILS_MONGO_URI doit viser une base de test : ${URI}`);
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 2500 });
    await mongoose.connection.dropDatabase();
    available = true;
  } catch {
    available = false;
  }
  console.log = (...args) => logs.push(args.join(' '));
});

after(async () => {
  console.log = realLog;
  if (available) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const sentTo = () => logs.filter((line) => line.includes('Mail simulé'));
const user = (centerId, email, extra = {}) =>
  User.create({ name: 'U', lastName: 'V', email, password: 'x'.repeat(20), registrationStatus: 'verified', centerId, ...extra });
const center = (name) => Center.create({ name, OACI: 'TEST', type: 'app', timeZone: 'Europe/Paris' });

test('the three mails reach the right people only', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const a = await center('A');
  const b = await center('B');
  const moved = await user(b._id, 'moved@x.fr');
  const muted = await user(a._id, 'muted@x.fr', { preferences: { emails: { all: false } } });
  await user(a._id, 'a1@x.fr');
  await user(a._id, 'off@x.fr', { isActive: false });
  await user(a._id, 'waiting@x.fr', { registrationStatus: 'pending' });
  const rotation = await Rotation.create({ name: 'R', centerId: a._id });

  assert.deepEqual(await notifyCenterTransferAccepted(moved._id, a._id), { sent: 1 });
  assert.deepEqual(await notifyCenterTransferAccepted(muted._id, b._id), { sent: 0 });

  logs.length = 0;
  assert.deepEqual(await notifyRotationChange({ centerId: a._id, rotationId: rotation._id, day: '2026-12-01', demandsAffected: false }), { sent: 1 });
  assert.equal(sentTo().length, 1);
  assert.match(sentTo()[0], /a1@x\.fr/);

  const ticket = { shortId: 'abc123', title: 'T', type: 'assistance', createdAt: new Date() };
  assert.deepEqual(await notifyTicketReceived(ticket, moved), { sent: 1 });
  assert.deepEqual(await notifyTicketReceived(ticket, null), { sent: 0 }, 'no account, no acknowledgement');
});

test('a new ticket gets its number at creation and only an account is acknowledged', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const c = await center('C');
  await user(c._id, 'master@x.fr', { isAdmin: true, adminType: 'master' });
  await user(c._id, 'known@x.fr');
  const data = { adminType: 'master', type: 'assistance', subject: 'S', message: 'M' };

  logs.length = 0;
  const known = await createNewTicket({ ...data, email: 'known@x.fr' });
  assert.equal((await Ticket.findById(known._id)).shortId, known._id.toString().slice(-6));
  assert.ok(sentTo().some((line) => line.includes('known@x.fr') && line.includes(`CELESTE-${known._id.toString().slice(-6)}`)));

  logs.length = 0;
  await createNewTicket({ ...data, email: 'stranger@x.fr' });
  assert.ok(!sentTo().some((line) => line.includes('stranger@x.fr')));
});
