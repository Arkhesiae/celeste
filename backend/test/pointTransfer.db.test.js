/**
 * Transferts de points : le job des transferts différés et le transfert immédiat prévenent par email les bonnes personnes
 * (exécuté pour une demande : les deux ; manuel : le receveur ; annulé : les deux), et les soldes bougent comme avant.
 *
 *   node --test backend/test/pointTransfer.db.test.js
 *
 * Nécessite un MongoDB local (TEST_POINTS_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_points), supprimé à la fin.
 * Sans MongoDB joignable, les tests sont ignorés. Les mails partent par le transporteur console, dont on lit les traces.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User from '../models/User.js';
import PointTransfer from '../models/PointTransfer.js';
import { processPendingTransactions } from '../services/transaction/transaction.scheduled.js';
import { transferPoints } from '../services/user/user.points.js';

const URI = process.env.TEST_POINTS_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_points';
let available = false;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_POINTS_MONGO_URI doit viser une base de test : ${URI}`);
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

const makeUser = async (name, points) =>
  User.create({
    name, lastName: 'Test', email: `${name.toLowerCase()}-${new mongoose.Types.ObjectId()}@x.fr`, password: await bcrypt.hash('x', 4),
    registrationStatus: 'verified', centerId: new mongoose.Types.ObjectId(), points,
  });

/** Exécute `action` et rend les adresses auxquelles un mail est parti (traces « Email envoyé à » du transporteur console) */
const mailedDuring = async (action) => {
  const recipients = [];
  const original = console.log;
  console.log = (...args) => {
    if (args[0] === '📧 Email envoyé à:') recipients.push(args[1]);
  };
  try {
    await action();
  } finally {
    console.log = original;
  }
  return recipients;
};

const yesterday = () => new Date(Date.now() - 36 * 3600 * 1000);

test('transfert différé manuel exécuté : les points bougent, le receveur est prévenu', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const sender = await makeUser('Alex', 20);
  const receiver = await makeUser('Camille', 0);
  await PointTransfer.create({ sender: sender._id, receiver: receiver._id, amount: 5, type: 'transfer', status: 'pending', effectiveDate: yesterday() });

  const mailed = await mailedDuring(() => processPendingTransactions());

  assert.deepEqual(mailed, [receiver.email]);
  assert.equal((await User.findById(sender._id)).points, 15);
  assert.equal((await User.findById(receiver._id)).points, 5);
});

test('transfert différé lié à une demande qui n\'est plus acceptée : annulé, les deux sont prévenus', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const sender = await makeUser('Alex2', 20);
  const receiver = await makeUser('Camille2', 0);
  const transfer = await PointTransfer.create({
    sender: sender._id, receiver: receiver._id, amount: 5, type: 'replacement', request: new mongoose.Types.ObjectId(), status: 'pending', effectiveDate: yesterday(),
  });

  const mailed = await mailedDuring(() => processPendingTransactions());

  assert.deepEqual(mailed.sort(), [receiver.email, sender.email].sort());
  assert.equal((await PointTransfer.findById(transfer._id)).status, 'cancelled');
  assert.equal((await User.findById(sender._id)).points, 20);
});

test('transfert différé dont l\'expéditeur n\'a plus le solde : annulé, les deux sont prévenus', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const sender = await makeUser('Alex3', -39);
  const receiver = await makeUser('Camille3', 0);
  const transfer = await PointTransfer.create({ sender: sender._id, receiver: receiver._id, amount: 5, type: 'transfer', status: 'pending', effectiveDate: yesterday() });

  const mailed = await mailedDuring(() => processPendingTransactions());

  assert.deepEqual(mailed.sort(), [receiver.email, sender.email].sort());
  assert.equal((await PointTransfer.findById(transfer._id)).status, 'cancelled');
});

test('transfert immédiat : seul le receveur est prévenu', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const sender = await makeUser('Alex4', 20);
  const receiver = await makeUser('Camille4', 0);

  const mailed = await mailedDuring(async () => {
    await transferPoints({ fromUserId: sender._id.toString(), toUserId: receiver._id.toString(), amount: 4, description: 'Merci' });
    await new Promise((resolve) => setTimeout(resolve, 300)); // l'envoi n'est pas attendu par le service
  });

  assert.deepEqual(mailed, [receiver.email]);
  assert.equal((await User.findById(receiver._id)).points, 4);
});
